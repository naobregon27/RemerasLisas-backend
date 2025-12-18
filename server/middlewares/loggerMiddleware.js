import colors from 'colors';

// Middleware para registrar las peticiones en la consola
const logger = (req, res, next) => {
  const method = req.method;
  const url = req.url;
  const timestamp = new Date().toLocaleString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const userId = req.user ? req.user._id : 'No autenticado';
  const userRole = req.user ? req.user.role : 'N/A';

  let methodColor;
  switch (method) {
    case 'GET':
      methodColor = colors.green(method);
      break;
    case 'POST':
      methodColor = colors.yellow(method);
      break;
    case 'PUT':
      methodColor = colors.blue(method);
      break;
    case 'DELETE':
      methodColor = colors.red(method);
      break;
    case 'PATCH':
      methodColor = colors.magenta(method);
      break;
    default:
      methodColor = colors.white(method);
  }

  console.log(`[${colors.cyan(timestamp)}] ${methodColor} ${colors.bold(url)}`);
  console.log(`  Usuario: ${colors.yellow(userId)} (${colors.yellow(userRole)})`);
  console.log(`  IP: ${ip} | User-Agent: ${userAgent.substring(0, 50)}...`);
  
  // Registrar también cuerpo de la petición en caso de POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    // Ocultamos contraseñas por seguridad
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[OCULTO]';
    console.log(`  Body: ${JSON.stringify(sanitizedBody)}`);
  }
  
  console.log(''); // Línea en blanco para separar peticiones

  // Medir tiempo de respuesta
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    let statusColor;
    
    if (statusCode >= 500) {
      statusColor = colors.red(statusCode);
    } else if (statusCode >= 400) {
      statusColor = colors.yellow(statusCode);
    } else if (statusCode >= 300) {
      statusColor = colors.cyan(statusCode);
    } else {
      statusColor = colors.green(statusCode);
    }
    
    console.log(`[${colors.cyan(timestamp)}] Respuesta: ${statusColor} (${duration}ms)`);
    console.log(''); // Línea en blanco para separar respuestas
  });

  next();
};

export default logger; 