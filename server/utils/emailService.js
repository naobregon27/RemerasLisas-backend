const sgMail = require('@sendgrid/mail');

/**
 * Email Service using SendGrid
 */
class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Send email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('📧 Email would be sent (SendGrid not configured):', { to, subject });
        return { success: true, message: 'Email service not configured' };
      }

      const msg = {
        to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: process.env.SENDGRID_FROM_NAME || 'Remeras Lisas',
        },
        subject,
        text,
        html,
      };

      await sgMail.send(msg);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Bienvenido a Remeras Lisas!</h2>
        <p>Hola ${user.name},</p>
        <p>Tu email ha sido verificado. ¡Gracias por unirte a nuestra tienda!</p>
        <p>Ya puedes comenzar a comprar y seguir tus pedidos.</p>
        <p>Saludos,<br>El equipo de Remeras Lisas</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Bienvenido a Remeras Lisas',
      html,
      text: `Hola ${user.name}, tu email ha sido verificado. Bienvenido a Remeras Lisas.`,
    });
  }

  /**
   * Send email verification code (6 digits)
   */
  async sendEmailVerificationCode(user, code) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verifica tu email</h2>
        <p>Hola ${user.name},</p>
        <p>Tu código de verificación es:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; letter-spacing: 6px; font-weight: bold; background: #f5f5f5; padding: 12px 18px; border-radius: 6px;">${code}</span>
        </div>
        <p>Este enlace expirará en 24 horas.</p>
        <p>Saludos,<br>El equipo de Remeras Lisas</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Código de verificación - Remeras Lisas',
      html,
      text: `Tu código de verificación es: ${code}. Expira en 24 horas.`,
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, user) {
    const orderUrl = `${process.env.FRONTEND_URL}/orders/${order._id}`;
    
    const itemsHtml = order.items.map(item => {
      // Use the image from order item, or try to get it from populated product
      const imageUrl = item.image || 
                       (item.product?.images?.[0]?.url) || 
                       (item.product?.images?.[0]) || 
                       '';
      const productName = item.name || item.product?.name || 'Producto';
      
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 10px;">` : ''}
          ${productName}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>¡Pedido Confirmado!</h2>
        <p>Hola ${user.name},</p>
        <p>Tu pedido ha sido recibido y está siendo procesado.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Detalles del Pedido</h3>
          <p><strong>Número de Pedido:</strong> #${order.orderNumber}</p>
          <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString('es-AR')}</p>
          <p><strong>Estado:</strong> ${order.status}</p>
          <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Cantidad</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Precio</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Pedido
          </a>
        </p>
        <p>Saludos,<br>El equipo de Remeras Lisas</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Pedido Confirmado #${order.orderNumber} - Remeras Lisas`,
      html,
      text: `Tu pedido #${order.orderNumber} ha sido confirmado. Total: $${order.total.toFixed(2)}`,
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(order, user) {
    const orderUrl = `${process.env.FRONTEND_URL}/orders/${order._id}`;
    
    const statusMessages = {
      confirmed: 'Tu pedido ha sido confirmado y está siendo preparado.',
      preparing: 'Tu pedido está siendo preparado.',
      shipped: 'Tu pedido ha sido enviado.',
      delivered: 'Tu pedido ha sido entregado. ¡Esperamos que disfrutes tu compra!',
      cancelled: 'Tu pedido ha sido cancelado.',
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Actualización de Pedido</h2>
        <p>Hola ${user.name},</p>
        <p>El estado de tu pedido ha cambiado:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Número de Pedido:</strong> #${order.orderNumber}</p>
          <p><strong>Nuevo Estado:</strong> ${order.status}</p>
          <p>${statusMessages[order.status] || 'El estado de tu pedido ha sido actualizado.'}</p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Pedido
          </a>
        </p>
        <p>Saludos,<br>El equipo de Remeras Lisas</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Actualización de Pedido #${order.orderNumber} - Remeras Lisas`,
      html,
      text: `Tu pedido #${order.orderNumber} ahora está: ${order.status}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Restablecer Contraseña</h2>
        <p>Hola ${user.name},</p>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </p>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p>${resetUrl}</p>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignora este email.</p>
        <p>Saludos,<br>El equipo de Remeras Lisas</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Restablecer Contraseña - Remeras Lisas',
      html,
      text: `Restablecer contraseña: ${resetUrl}`,
    });
  }
}

module.exports = new EmailService();


