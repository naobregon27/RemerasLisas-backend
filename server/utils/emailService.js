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
 * Enviar notificación de confirmación de pedido (mejorado)
 */
export const sendOrderConfirmationEmail = async (email, name, pedido) => {
  const local = pedido.local || {};
  const localNombre = local.nombre || 'Remeras Lisas';
  const subject = `¡Pedido confirmado! #${pedido.codigoPedido} - ${localNombre}`;
  
  // Formatear productos
  const productosHtml = pedido.productos.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.producto?.nombre || 'Producto'}</strong>
        ${item.variante?.nombre ? `<br><small style="color: #666;">${item.variante.nombre}: ${item.variante.valor}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.precio?.toFixed(2) || '0.00'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal?.toFixed(2) || '0.00'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .container { padding: 30px 20px; }
        .success-badge { background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #28a745; }
        .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #495057; }
        .info-value { color: #212529; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table th { background-color: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; }
        table td { padding: 12px; border-bottom: 1px solid #eee; }
        .total-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.grand-total { border-top: 2px solid #dee2e6; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: bold; color: #667eea; }
        .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .address-box { background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; margin: 15px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>¡Pedido Confirmado!</h1>
        </div>
        <div class="container">
          <div class="success-badge">
            <strong>✓ Tu pedido ha sido recibido y está siendo procesado</strong>
          </div>
          
          <p>Hola <strong>${name}</strong>,</p>
          <p>Gracias por tu compra en <strong>${localNombre}</strong>. Hemos recibido tu pedido y te enviaremos una confirmación cuando esté listo para enviar.</p>
          
          <div class="order-info">
            <div class="info-row">
              <span class="info-label">Código de pedido:</span>
              <span class="info-value"><strong>#${pedido.codigoPedido}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha del pedido:</span>
              <span class="info-value">${new Date(pedido.createdAt).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <span class="info-value">${pedido.estadoPedido === 'pendiente' ? 'Pendiente' : pedido.estadoPedido === 'procesando' ? 'En proceso' : pedido.estadoPedido}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Método de pago:</span>
              <span class="info-value">${pedido.metodoPago === 'mercadopago' ? 'Mercado Pago' : pedido.metodoPago === 'tarjeta' ? 'Tarjeta' : pedido.metodoPago === 'efectivo' ? 'Efectivo' : pedido.metodoPago === 'transferencia' ? 'Transferencia' : pedido.metodoPago}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado de pago:</span>
              <span class="info-value">${pedido.estadoPago === 'pendiente' ? 'Pendiente' : pedido.estadoPago === 'completado' ? '✓ Pagado' : pedido.estadoPago === 'procesando' ? 'Procesando' : pedido.estadoPago}</span>
            </div>
          </div>

          ${pedido.direccionEnvio ? `
          <h3 style="margin-top: 30px; color: #495057;">Dirección de envío</h3>
          <div class="address-box">
            <p style="margin: 5px 0;"><strong>${pedido.direccionEnvio.nombre}</strong></p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.direccion}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.pais}</p>
            <p style="margin: 5px 0;">Tel: ${pedido.direccionEnvio.telefono}</p>
          </div>
          ` : ''}

          <h3 style="margin-top: 30px; color: #495057;">Productos</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${pedido.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            ${pedido.descuento > 0 ? `
            <div class="total-row" style="color: #28a745;">
              <span>Descuento:</span>
              <span>-$${pedido.descuento?.toFixed(2) || '0.00'}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Envío:</span>
              <span>$${pedido.costoEnvio?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="total-row">
              <span>Impuestos:</span>
              <span>$${pedido.impuestos?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          ${pedido.notas ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>Notas del pedido:</strong>
            <p style="margin: 10px 0 0 0;">${pedido.notas}</p>
          </div>
          ` : ''}

          <p style="margin-top: 30px;">Recibirás un email cuando tu pedido sea enviado con los detalles de seguimiento.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/mis-pedidos/${pedido._id}" class="button">Ver detalles del pedido</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${localNombre}</strong></p>
          <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${localNombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `¡Pedido confirmado!\n\nHola ${name},\n\nTu pedido #${pedido.codigoPedido} ha sido confirmado exitosamente.\n\nTotal: $${pedido.total?.toFixed(2) || '0.00'}\n\n${pedido.direccionEnvio ? `Dirección de envío:\n${pedido.direccionEnvio.nombre}\n${pedido.direccionEnvio.direccion}\n${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}\n` : ''}\nProductos:\n${pedido.productos.map(item => `- ${item.producto?.nombre || 'Producto'} x${item.cantidad} - $${item.subtotal?.toFixed(2) || '0.00'}`).join('\n')}\n\nTe notificaremos cuando tu pedido sea enviado.\n\nGracias por tu compra!`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar notificación de nueva orden al administrador/tienda
 */
export const sendNewOrderNotificationToAdmin = async (adminEmail, adminName, pedido, local) => {
  const localNombre = local?.nombre || 'Remeras Lisas';
  const cliente = pedido.usuario || {};
  const subject = `🆕 Nueva Orden #${pedido.codigoPedido} - ${localNombre}`;

  // Formatear productos
  const productosHtml = pedido.productos.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.producto?.nombre || 'Producto'}</strong>
        ${item.variante?.nombre ? `<br><small style="color: #666;">${item.variante.nombre}: ${item.variante.valor}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.precio?.toFixed(2) || '0.00'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.subtotal?.toFixed(2) || '0.00'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .container { padding: 30px 20px; }
        .alert-box { background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #ffc107; font-weight: 600; }
        .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #495057; }
        .info-value { color: #212529; }
        .client-box { background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; margin: 15px 0; }
        .address-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table th { background-color: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6; }
        table td { padding: 12px; border-bottom: 1px solid #eee; }
        .total-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.grand-total { border-top: 2px solid #dee2e6; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: bold; color: #28a745; }
        .button { display: inline-block; padding: 14px 28px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>🆕 Nueva Orden Recibida</h1>
        </div>
        <div class="container">
          <div class="alert-box">
            ⚠️ Nueva orden requiere tu atención
          </div>
          
          <p>Hola <strong>${adminName || 'Administrador'}</strong>,</p>
          <p>Has recibido una nueva orden en <strong>${localNombre}</strong>. Por favor, revisa los detalles a continuación y procesa el pedido.</p>
          
          <div class="order-info">
            <div class="info-row">
              <span class="info-label">Código de pedido:</span>
              <span class="info-value"><strong>#${pedido.codigoPedido}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span class="info-value">${new Date(pedido.createdAt).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado del pedido:</span>
              <span class="info-value">${pedido.estadoPedido === 'pendiente' ? '⏳ Pendiente' : pedido.estadoPedido === 'procesando' ? '🔄 Procesando' : pedido.estadoPedido}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Método de pago:</span>
              <span class="info-value">${pedido.metodoPago === 'mercadopago' ? '💳 Mercado Pago' : pedido.metodoPago === 'tarjeta' ? '💳 Tarjeta' : pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : pedido.metodoPago === 'transferencia' ? '🏦 Transferencia' : pedido.metodoPago}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado de pago:</span>
              <span class="info-value">${pedido.estadoPago === 'completado' ? '✅ Pagado' : pedido.estadoPago === 'pendiente' ? '⏳ Pendiente' : pedido.estadoPago === 'procesando' ? '🔄 Procesando' : pedido.estadoPago === 'fallido' ? '❌ Fallido' : pedido.estadoPago}</span>
            </div>
            <div class="info-row grand-total" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #dee2e6;">
              <span class="info-label">TOTAL:</span>
              <span class="info-value" style="font-size: 24px; color: #28a745;">$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <h3 style="margin-top: 30px; color: #495057;">Cliente</h3>
          <div class="client-box">
            <p style="margin: 5px 0;"><strong>Nombre:</strong> ${cliente.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${cliente.email || 'N/A'}</p>
            ${cliente.telefono ? `<p style="margin: 5px 0;"><strong>Teléfono:</strong> ${cliente.telefono}</p>` : ''}
          </div>

          ${pedido.direccionEnvio ? `
          <h3 style="margin-top: 30px; color: #495057;">Dirección de envío</h3>
          <div class="address-box">
            <p style="margin: 5px 0;"><strong>${pedido.direccionEnvio.nombre}</strong></p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.direccion}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.pais}</p>
            <p style="margin: 5px 0;">Tel: ${pedido.direccionEnvio.telefono}</p>
          </div>
          ` : ''}

          <h3 style="margin-top: 30px; color: #495057;">Productos</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${pedido.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            ${pedido.descuento > 0 ? `
            <div class="total-row" style="color: #28a745;">
              <span>Descuento:</span>
              <span>-$${pedido.descuento?.toFixed(2) || '0.00'}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Envío:</span>
              <span>$${pedido.costoEnvio?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="total-row">
              <span>Impuestos:</span>
              <span>$${pedido.impuestos?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          ${pedido.notas ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>Notas del cliente:</strong>
            <p style="margin: 10px 0 0 0;">${pedido.notas}</p>
          </div>
          ` : ''}

          ${pedido.datosTransaccion?.idTransaccion ? `
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
            <strong>Información de transacción:</strong>
            <p style="margin: 5px 0;">ID Transacción: ${pedido.datosTransaccion.idTransaccion}</p>
            ${pedido.datosTransaccion.mercadopago?.paymentId ? `<p style="margin: 5px 0;">Payment ID (MP): ${pedido.datosTransaccion.mercadopago.paymentId}</p>` : ''}
            ${pedido.datosTransaccion.fechaTransaccion ? `<p style="margin: 5px 0;">Fecha: ${new Date(pedido.datosTransaccion.fechaTransaccion).toLocaleString('es-AR')}</p>` : ''}
          </div>
          ` : ''}

          <p style="margin-top: 30px; font-weight: 600; color: #495057;">Por favor, accede al panel de administración para procesar esta orden.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/admin/pedidos/${pedido._id}" class="button">Ver pedido en el panel</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${localNombre}</strong></p>
          <p>Este es un email automático del sistema. Por favor, no respondas a este mensaje.</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${localNombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `🆕 Nueva Orden Recibida\n\nHola ${adminName || 'Administrador'},\n\nHas recibido una nueva orden #${pedido.codigoPedido} en ${localNombre}.\n\nCliente: ${cliente.name || 'N/A'} (${cliente.email || 'N/A'})\nTotal: $${pedido.total?.toFixed(2) || '0.00'}\nEstado: ${pedido.estadoPedido}\nEstado de pago: ${pedido.estadoPago}\n\n${pedido.direccionEnvio ? `Dirección de envío:\n${pedido.direccionEnvio.nombre}\n${pedido.direccionEnvio.direccion}\n${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}\n` : ''}\nProductos:\n${pedido.productos.map(item => `- ${item.producto?.nombre || 'Producto'} x${item.cantidad} - $${item.subtotal?.toFixed(2) || '0.00'}`).join('\n')}\n\nPor favor, accede al panel de administración para procesar esta orden.`;

  return await sendEmail(adminEmail, subject, html, text);
};

/**
 * Enviar confirmación de pago al cliente
 */
export const sendPaymentConfirmationEmail = async (email, name, pedido) => {
  const local = pedido.local || {};
  const localNombre = local.nombre || 'Remeras Lisas';
  const subject = `✅ Pago confirmado - Pedido #${pedido.codigoPedido} - ${localNombre}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .container { padding: 30px 20px; }
        .success-badge { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #28a745; }
        .payment-info { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #495057; }
        .info-value { color: #212529; }
        .button { display: inline-block; padding: 14px 28px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>✅ Pago Confirmado</h1>
        </div>
        <div class="container">
          <div class="success-badge">
            <strong style="font-size: 18px;">✓ Tu pago ha sido procesado exitosamente</strong>
          </div>
          
          <p>Hola <strong>${name}</strong>,</p>
          <p>¡Excelente noticia! Hemos recibido y confirmado tu pago para el pedido <strong>#${pedido.codigoPedido}</strong>.</p>
          
          <div class="payment-info">
            <h3 style="margin-top: 0; color: #007bff;">Detalles del pago</h3>
            <div class="info-row">
              <span class="info-label">Código de pedido:</span>
              <span class="info-value"><strong>#${pedido.codigoPedido}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Monto pagado:</span>
              <span class="info-value" style="font-size: 20px; font-weight: bold; color: #28a745;">$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Método de pago:</span>
              <span class="info-value">${pedido.metodoPago === 'mercadopago' ? '💳 Mercado Pago' : pedido.metodoPago === 'tarjeta' ? '💳 Tarjeta' : pedido.metodoPago === 'efectivo' ? '💵 Efectivo' : pedido.metodoPago === 'transferencia' ? '🏦 Transferencia' : pedido.metodoPago}</span>
            </div>
            ${pedido.datosTransaccion?.idTransaccion ? `
            <div class="info-row">
              <span class="info-label">ID de transacción:</span>
              <span class="info-value">${pedido.datosTransaccion.idTransaccion}</span>
            </div>
            ` : ''}
            ${pedido.datosTransaccion?.fechaTransaccion ? `
            <div class="info-row">
              <span class="info-label">Fecha de pago:</span>
              <span class="info-value">${new Date(pedido.datosTransaccion.fechaTransaccion).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            ` : ''}
          </div>

          <p>Tu pedido está siendo preparado. Te notificaremos cuando esté listo para enviar.</p>
          
          ${pedido.estadoPedido === 'procesando' ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>🔄 Estado actual:</strong> Tu pedido está en proceso y será enviado pronto.
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/mis-pedidos/${pedido._id}" class="button">Ver detalles del pedido</a>
          </div>

          <p>Si tienes alguna pregunta sobre tu pedido o pago, no dudes en contactarnos.</p>
        </div>
        
        <div class="footer">
          <p><strong>${localNombre}</strong></p>
          <p>Gracias por tu compra. ¡Esperamos que disfrutes tus productos!</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${localNombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `✅ Pago Confirmado\n\nHola ${name},\n\n¡Excelente noticia! Hemos recibido y confirmado tu pago para el pedido #${pedido.codigoPedido}.\n\nMonto pagado: $${pedido.total?.toFixed(2) || '0.00'}\nMétodo de pago: ${pedido.metodoPago}\n${pedido.datosTransaccion?.idTransaccion ? `ID de transacción: ${pedido.datosTransaccion.idTransaccion}\n` : ''}\nTu pedido está siendo preparado. Te notificaremos cuando esté listo para enviar.\n\nGracias por tu compra!`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar confirmación de envío con información de tracking
 */
export const sendShippingConfirmationEmail = async (email, name, pedido, trackingInfo = {}) => {
  const local = pedido.local || {};
  const localNombre = local.nombre || 'Remeras Lisas';
  const subject = `🚚 Tu pedido ha sido enviado - #${pedido.codigoPedido} - ${localNombre}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .container { padding: 30px 20px; }
        .shipping-badge { background: #d1ecf1; color: #0c5460; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #17a2b8; }
        .tracking-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; text-align: center; }
        .tracking-code { font-size: 24px; font-weight: bold; color: #856404; letter-spacing: 3px; margin: 10px 0; }
        .shipping-info { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #495057; }
        .info-value { color: #212529; }
        .address-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 14px 28px; background: #17a2b8; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>🚚 Tu Pedido ha Sido Enviado</h1>
        </div>
        <div class="container">
          <div class="shipping-badge">
            <strong style="font-size: 18px;">✓ Tu pedido está en camino</strong>
          </div>
          
          <p>Hola <strong>${name}</strong>,</p>
          <p>¡Excelente noticia! Tu pedido <strong>#${pedido.codigoPedido}</strong> ha sido enviado y está en camino a tu dirección.</p>
          
          ${trackingInfo.codigoSeguimiento ? `
          <div class="tracking-box">
            <p style="margin: 0 0 10px 0;"><strong>Código de seguimiento:</strong></p>
            <div class="tracking-code">${trackingInfo.codigoSeguimiento}</div>
            ${trackingInfo.urlSeguimiento ? `
            <p style="margin: 15px 0 0 0;">
              <a href="${trackingInfo.urlSeguimiento}" style="color: #856404; font-weight: 600; text-decoration: underline;">Rastrear envío aquí</a>
            </p>
            ` : ''}
          </div>
          ` : ''}

          <div class="shipping-info">
            <h3 style="margin-top: 0; color: #007bff;">Información de envío</h3>
            <div class="info-row">
              <span class="info-label">Código de pedido:</span>
              <span class="info-value"><strong>#${pedido.codigoPedido}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha de envío:</span>
              <span class="info-value">${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            ${trackingInfo.empresaEnvio ? `
            <div class="info-row">
              <span class="info-label">Empresa de envío:</span>
              <span class="info-value">${trackingInfo.empresaEnvio}</span>
            </div>
            ` : ''}
            ${trackingInfo.tiempoEstimado ? `
            <div class="info-row">
              <span class="info-label">Tiempo estimado de entrega:</span>
              <span class="info-value">${trackingInfo.tiempoEstimado}</span>
            </div>
            ` : ''}
          </div>

          ${pedido.direccionEnvio ? `
          <h3 style="margin-top: 30px; color: #495057;">Dirección de entrega</h3>
          <div class="address-box">
            <p style="margin: 5px 0;"><strong>${pedido.direccionEnvio.nombre}</strong></p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.direccion}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}</p>
            <p style="margin: 5px 0;">${pedido.direccionEnvio.pais}</p>
            <p style="margin: 5px 0;">Tel: ${pedido.direccionEnvio.telefono}</p>
          </div>
          ` : ''}

          ${trackingInfo.instrucciones ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>📋 Instrucciones especiales:</strong>
            <p style="margin: 10px 0 0 0;">${trackingInfo.instrucciones}</p>
          </div>
          ` : ''}

          <p style="margin-top: 30px;">Puedes rastrear tu pedido en cualquier momento usando el código de seguimiento proporcionado arriba.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/mis-pedidos/${pedido._id}" class="button">Ver detalles del pedido</a>
          </div>

          <p>Si tienes alguna pregunta sobre tu envío, no dudes en contactarnos.</p>
        </div>
        
        <div class="footer">
          <p><strong>${localNombre}</strong></p>
          <p>¡Gracias por tu compra! Esperamos que disfrutes tus productos.</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${localNombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `🚚 Tu pedido ha sido enviado\n\nHola ${name},\n\n¡Excelente noticia! Tu pedido #${pedido.codigoPedido} ha sido enviado y está en camino.\n\n${trackingInfo.codigoSeguimiento ? `Código de seguimiento: ${trackingInfo.codigoSeguimiento}\n${trackingInfo.urlSeguimiento ? `Rastrear: ${trackingInfo.urlSeguimiento}\n` : ''}` : ''}${trackingInfo.empresaEnvio ? `Empresa: ${trackingInfo.empresaEnvio}\n` : ''}${trackingInfo.tiempoEstimado ? `Tiempo estimado: ${trackingInfo.tiempoEstimado}\n` : ''}\n${pedido.direccionEnvio ? `Dirección de entrega:\n${pedido.direccionEnvio.nombre}\n${pedido.direccionEnvio.direccion}\n${pedido.direccionEnvio.ciudad}, ${pedido.direccionEnvio.codigoPostal}\n` : ''}\nPuedes rastrear tu pedido usando el código de seguimiento proporcionado.\n\n¡Gracias por tu compra!`;

  return await sendEmail(email, subject, html, text);
};

/**
 * Enviar notificación de cambio de estado de pedido (mejorado)
 */
export const sendOrderStatusUpdateEmail = async (email, name, pedido, nuevoEstado, notas = '') => {
  const estados = {
    'pendiente': { label: 'Pendiente', icon: '⏳', color: '#ffc107' },
    'procesando': { label: 'En procesamiento', icon: '🔄', color: '#17a2b8' },
    'enviado': { label: 'Enviado', icon: '🚚', color: '#17a2b8' },
    'entregado': { label: 'Entregado', icon: '✅', color: '#28a745' },
    'cancelado': { label: 'Cancelado', icon: '❌', color: '#dc3545' }
  };

  const estadoInfo = estados[nuevoEstado] || { label: nuevoEstado, icon: '📦', color: '#6c757d' };
  const local = pedido.local || {};
  const localNombre = local.nombre || 'Remeras Lisas';
  const subject = `${estadoInfo.icon} Actualización de pedido #${pedido.codigoPedido} - ${localNombre}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, ${estadoInfo.color} 0%, ${estadoInfo.color}dd 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .container { padding: 30px 20px; }
        .status-box { background: ${estadoInfo.color === '#28a745' ? '#d4edda' : estadoInfo.color === '#dc3545' ? '#f8d7da' : '#d1ecf1'}; color: ${estadoInfo.color === '#28a745' ? '#155724' : estadoInfo.color === '#dc3545' ? '#721c24' : '#0c5460'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid ${estadoInfo.color}; }
        .status-icon { font-size: 48px; margin: 10px 0; }
        .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #495057; }
        .info-value { color: #212529; }
        .message-box { background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0; }
        .button { display: inline-block; padding: 14px 28px; background: ${estadoInfo.color}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>${estadoInfo.icon} Actualización de Pedido</h1>
        </div>
        <div class="container">
          <div class="status-box">
            <div class="status-icon">${estadoInfo.icon}</div>
            <p style="margin: 10px 0; font-size: 18px; font-weight: 600;">El estado de tu pedido ha cambiado</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">${estadoInfo.label}</p>
          </div>
          
          <p>Hola <strong>${name}</strong>,</p>
          <p>Queremos informarte que el estado de tu pedido <strong>#${pedido.codigoPedido}</strong> ha sido actualizado.</p>
          
          <div class="order-info">
            <div class="info-row">
              <span class="info-label">Código de pedido:</span>
              <span class="info-value"><strong>#${pedido.codigoPedido}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Nuevo estado:</span>
              <span class="info-value" style="font-weight: bold; color: ${estadoInfo.color};">${estadoInfo.icon} ${estadoInfo.label}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span class="info-value">${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total:</span>
              <span class="info-value">$${pedido.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          ${nuevoEstado === 'enviado' ? `
          <div class="message-box">
            <p style="margin: 0;"><strong>🚚 Tu pedido ha sido enviado</strong></p>
            <p style="margin: 10px 0 0 0;">Tu pedido está en camino a la dirección de envío proporcionada. Recibirás un email separado con los detalles de seguimiento.</p>
          </div>
          ` : ''}

          ${nuevoEstado === 'entregado' ? `
          <div class="message-box" style="background: #d4edda; border-left-color: #28a745; color: #155724;">
            <p style="margin: 0;"><strong>✅ ¡Tu pedido ha sido entregado!</strong></p>
            <p style="margin: 10px 0 0 0;">Esperamos que disfrutes tus productos. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
            ${pedido.fechaEntrega ? `<p style="margin: 10px 0 0 0;">Fecha de entrega: ${new Date(pedido.fechaEntrega).toLocaleDateString('es-AR')}</p>` : ''}
          </div>
          ` : ''}

          ${nuevoEstado === 'procesando' ? `
          <div class="message-box">
            <p style="margin: 0;"><strong>🔄 Tu pedido está siendo procesado</strong></p>
            <p style="margin: 10px 0 0 0;">Estamos preparando tu pedido. Te notificaremos cuando esté listo para enviar.</p>
          </div>
          ` : ''}

          ${nuevoEstado === 'cancelado' ? `
          <div class="message-box" style="background: #f8d7da; border-left-color: #dc3545; color: #721c24;">
            <p style="margin: 0;"><strong>❌ Tu pedido ha sido cancelado</strong></p>
            <p style="margin: 10px 0 0 0;">Si el pago ya fue procesado, se realizará un reembolso según las políticas de la tienda. Si tienes alguna pregunta, contáctanos.</p>
          </div>
          ` : ''}

          ${notas ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>📝 Notas adicionales:</strong>
            <p style="margin: 10px 0 0 0;">${notas}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/mis-pedidos/${pedido._id}" class="button">Ver detalles del pedido</a>
          </div>

          <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
        </div>
        
        <div class="footer">
          <p><strong>${localNombre}</strong></p>
          <p>Gracias por confiar en nosotros.</p>
          <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${localNombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  let mensajeTexto = `${estadoInfo.icon} Actualización de pedido\n\nHola ${name},\n\nEl estado de tu pedido #${pedido.codigoPedido} ha cambiado a: ${estadoInfo.label}\n\n`;
  
  if (nuevoEstado === 'enviado') {
    mensajeTexto += 'Tu pedido está en camino. Recibirás un email con los detalles de seguimiento.\n\n';
  } else if (nuevoEstado === 'entregado') {
    mensajeTexto += '¡Tu pedido ha sido entregado! Esperamos que disfrutes tus productos.\n\n';
  } else if (nuevoEstado === 'cancelado') {
    mensajeTexto += 'Tu pedido ha sido cancelado. Si el pago ya fue procesado, se realizará un reembolso.\n\n';
  }
  
  if (notas) {
    mensajeTexto += `Notas: ${notas}\n\n`;
  }
  
  mensajeTexto += `Gracias por tu compra.`;

  const text = mensajeTexto;

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
  sendNewOrderNotificationToAdmin,
  sendPaymentConfirmationEmail,
  sendShippingConfirmationEmail,
  sendOrderStatusUpdateEmail
};

