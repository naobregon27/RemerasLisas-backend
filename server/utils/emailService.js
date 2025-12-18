import sgMail from '@sendgrid/mail';

// Variables que se configurarán después de cargar dotenv
let sendGridApiKey = null;
let fromEmail = 'noreply@remeraslisas.com';
let fromName = 'Remeras Lisas';
let frontendUrl = 'http://localhost:3001';

// Función para configurar SendGrid (se llama después de cargar dotenv)
export const configureSendGrid = () => {
  sendGridApiKey = process.env.SENDGRID_API_KEY?.trim();
  fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || 'noreply@remeraslisas.com';
  fromName = process.env.SENDGRID_FROM_NAME?.trim() || 'Remeras Lisas';
  frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:3001';

  // Logs de diagnóstico
  console.log('\n📧 Diagnóstico SendGrid:');
  console.log('   Variable SENDGRID_API_KEY existe:', process.env.SENDGRID_API_KEY ? 'SI' : 'NO');
  console.log('   Longitud de la key:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
  console.log('   Primeros caracteres:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 15) + '...' : 'N/A');

  if (sendGridApiKey) {
    // Validar formato de API key de SendGrid (debe empezar con SG.)
    if (!sendGridApiKey.startsWith('SG.')) {
      console.error('❌ Error: SENDGRID_API_KEY no tiene el formato correcto. Debe empezar con "SG."');
      console.error('   Key recibida:', sendGridApiKey.substring(0, 20) + '...');
    } else {
      sgMail.setApiKey(sendGridApiKey);
      console.log('✅ SendGrid configurado correctamente');
      console.log('   Email FROM:', fromEmail);
    }
  } else {
    console.warn('⚠️  SENDGRID_API_KEY no está configurada. Los emails se mostrarán en consola.');
    console.warn('   Verifica que el archivo .env esté en la carpeta server/');
    console.warn('   Verifica que SENDGRID_API_KEY esté definida en el .env');
  }
  console.log('');
};

/**
 * Enviar email genérico
 */
const sendEmail = async (to, subject, html, text = '') => {
  try {
    // Si SendGrid no está configurado, solo logear
    if (!sendGridApiKey) {
      console.log('📧 [MOCK EMAIL] ------------------');
      console.log(`   Para: ${to}`);
      console.log(`   Asunto: ${subject}`);
      console.log(`   Contenido: ${text.substring(0, 100)}...`);
      console.log('----------------------------------');
      return true;
    }

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      text,
      html
    };

    await sgMail.send(msg);
    console.log(`✅ Email enviado exitosamente a ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    
    if (error.response) {
      const errorBody = error.response.body;
      console.error('📋 Detalles del error:', JSON.stringify(errorBody, null, 2));
      
      // Mensajes de error más específicos
      if (error.response.statusCode === 401) {
        console.error('🔑 Error de autenticación con SendGrid:');
        console.error('   - Verifica que SENDGRID_API_KEY sea correcta');
        console.error('   - La API key debe empezar con "SG."');
        console.error('   - Asegúrate de que no tenga espacios al inicio o final');
        console.error(`   - API Key actual: ${sendGridApiKey ? sendGridApiKey.substring(0, 10) + '...' : 'NO CONFIGURADA'}`);
      } else if (error.response.statusCode === 403) {
        console.error('🚫 Error de permisos con SendGrid:');
        console.error('   - Verifica que el email "from" esté verificado en SendGrid');
        console.error(`   - Email from actual: ${fromEmail}`);
        console.error('   - Ve a SendGrid > Settings > Sender Authentication');
      }
    }
    
    return false;
  }
};

/**
 * Enviar código de verificación de email
 */
export const sendVerificationCode = async (email, name, code) => {
  const subject = 'Código de verificación - Remeras Lisas';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code-box { background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>¡Bienvenido a Remeras Lisas!</h2>
        <p>Hola ${name},</p>
        <p>Gracias por registrarte. Para completar tu registro, por favor ingresa el siguiente código de verificación:</p>
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        <p>Este código expirará en 10 minutos.</p>
        <p>Si no solicitaste este código, puedes ignorar este email.</p>
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Bienvenido a Remeras Lisas!\n\nTu código de verificación es: ${code}\n\nEste código expirará en 10 minutos.`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar email de bienvenida con link de verificación
 */
export const sendWelcomeEmail = async (user, verificationToken) => {
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
  const subject = '¡Bienvenido a Remeras Lisas! Verifica tu email';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>¡Bienvenido a Remeras Lisas!</h2>
        <p>Hola ${user.name},</p>
        <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente botón:</p>
        <p>
          <a href="${verificationUrl}" class="button">Verificar Email</a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
        <p>Si no te registraste en Remeras Lisas, puedes ignorar este email.</p>
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `¡Bienvenido a Remeras Lisas!\n\nPara verificar tu email, visita: ${verificationUrl}\n\nEste enlace expirará en 24 horas.`;

  return await sendEmail(user.email, subject, html, text);
};

/**
 * Enviar email de bienvenida después de verificar el email
 */
export const sendWelcomeEmailAfterVerification = async (email, name) => {
  const subject = '¡Bienvenido a Remeras Lisas!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .success-box { background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>¡Email verificado exitosamente!</h2>
        <p>Hola ${name},</p>
        <div class="success-box">
          <p><strong>¡Tu cuenta ha sido verificada correctamente!</strong></p>
          <p>Ya puedes disfrutar de todos nuestros productos y servicios.</p>
        </div>
        <p>Gracias por unirte a Remeras Lisas. ¡Esperamos que disfrutes tu experiencia de compra!</p>
        <p>
          <a href="${frontendUrl}" class="button">Explorar productos</a>
        </p>
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `¡Bienvenido a Remeras Lisas!\n\nTu cuenta ha sido verificada correctamente. Ya puedes disfrutar de todos nuestros productos.\n\nVisita: ${frontendUrl}`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar email de verificación (reenvío)
 */
export const sendEmailVerification = async (user, verificationToken) => {
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
  const subject = 'Verifica tu email - Remeras Lisas';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Verifica tu email</h2>
        <p>Hola ${user.name},</p>
        <p>Has solicitado un nuevo enlace de verificación. Haz clic en el siguiente botón para verificar tu email:</p>
        <p>
          <a href="${verificationUrl}" class="button">Verificar Email</a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Verifica tu email en Remeras Lisas\n\nPara verificar tu email, visita: ${verificationUrl}\n\nEste enlace expirará en 24 horas.`;

  return await sendEmail(user.email, subject, html, text);
};

/**
 * Enviar email de recuperación de contraseña con código de 6 dígitos
 */
export const sendPasswordReset = async (user, resetCode) => {
  try {
    console.log(`📧 Preparando email de recuperación para: ${user.email}`);
    console.log(`📧 Código a enviar: ${resetCode}`);
    
    const subject = 'Código de recuperación de contraseña - Remeras Lisas';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code-box { background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          .warning { color: #dc3545; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Recuperación de contraseña</h2>
          <p>Hola ${user.name},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Por favor ingresa el siguiente código de verificación:</p>
          <div class="code-box">
            <div class="code">${resetCode}</div>
          </div>
          <p>Este código expirará en 10 minutos.</p>
          <p class="warning">Si no solicitaste este cambio, puedes ignorar este email.</p>
          <div class="footer">
            <p>Saludos,<br>El equipo de Remeras Lisas</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const text = `Recuperación de contraseña\n\nHola ${user.name},\n\nTu código de recuperación es: ${resetCode}\n\nEste código expirará en 10 minutos.\n\nSi no solicitaste este cambio, puedes ignorar este email.`;

    const result = await sendEmail(user.email, subject, html, text);
    
    if (result) {
      console.log(`✅ Email de recuperación enviado exitosamente a: ${user.email}`);
    } else {
      console.error(`❌ Error: No se pudo enviar el email de recuperación a: ${user.email}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error en sendPasswordReset:', error);
    return false;
  }
};

// Alias para compatibilidad
export const sendPasswordResetEmail = sendPasswordReset;

/**
 * Enviar notificación de confirmación de pedido
 */
export const sendOrderConfirmationEmail = async (email, name, pedido) => {
  const subject = `Confirmación de pedido #${pedido.codigoPedido} - Remeras Lisas`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .order-info { background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .product-item { padding: 10px 0; border-bottom: 1px solid #ddd; }
        .total { font-size: 18px; font-weight: bold; margin-top: 15px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>¡Pedido confirmado!</h2>
        <p>Hola ${name},</p>
        <p>Tu pedido ha sido confirmado exitosamente. Aquí están los detalles:</p>
        <div class="order-info">
          <p><strong>Código de pedido:</strong> ${pedido.codigoPedido}</p>
          <p><strong>Estado:</strong> ${pedido.estadoPedido}</p>
          <p><strong>Fecha:</strong> ${new Date(pedido.createdAt).toLocaleDateString('es-AR')}</p>
          <h3>Productos:</h3>
          ${pedido.productos.map(item => `
            <div class="product-item">
              <p><strong>${item.producto?.nombre || 'Producto'}</strong> - Cantidad: ${item.cantidad} - $${item.precio}</p>
            </div>
          `).join('')}
          <div class="total">
            <p>Subtotal: $${pedido.subtotal}</p>
            <p>Envío: $${pedido.costoEnvio}</p>
            <p>Impuestos: $${pedido.impuestos}</p>
            <p>Total: $${pedido.total}</p>
          </div>
        </div>
        <p>Te notificaremos cuando tu pedido sea enviado.</p>
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Pedido confirmado #${pedido.codigoPedido}\n\nTotal: $${pedido.total}\n\nGracias por tu compra!`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar notificación de cambio de estado de pedido
 */
export const sendOrderStatusUpdateEmail = async (email, name, pedido, nuevoEstado) => {
  const estados = {
    'pendiente': 'Pendiente',
    'procesando': 'En procesamiento',
    'enviado': 'Enviado',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  };

  const subject = `Actualización de pedido #${pedido.codigoPedido} - Remeras Lisas`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .status-box { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Actualización de tu pedido</h2>
        <p>Hola ${name},</p>
        <p>El estado de tu pedido ha sido actualizado:</p>
        <div class="status-box">
          <p><strong>Pedido:</strong> #${pedido.codigoPedido}</p>
          <p><strong>Nuevo estado:</strong> ${estados[nuevoEstado] || nuevoEstado}</p>
        </div>
        ${nuevoEstado === 'enviado' ? '<p>Tu pedido ha sido enviado. Pronto recibirás más información de seguimiento.</p>' : ''}
        ${nuevoEstado === 'entregado' ? '<p>¡Tu pedido ha sido entregado! Esperamos que disfrutes tus productos.</p>' : ''}
        ${nuevoEstado === 'cancelado' ? '<p>Tu pedido ha sido cancelado. Si tienes alguna pregunta, contáctanos.</p>' : ''}
        <div class="footer">
          <p>Saludos,<br>El equipo de Remeras Lisas</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Actualización de pedido #${pedido.codigoPedido}\n\nNuevo estado: ${estados[nuevoEstado] || nuevoEstado}`;

  return await sendEmail(email, subject, html, text);
};

export default {
  sendVerificationCode,
  sendWelcomeEmail,
  sendWelcomeEmailAfterVerification,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail
};

