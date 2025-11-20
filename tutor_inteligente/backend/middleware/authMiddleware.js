// middleware/authMiddleware.js - Verifica tokens JWT

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    // 1. Obtener el token del header 'Authorization'
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.split(' ')[1]; // Extrae el token después de "Bearer"

    // 2. Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Agregar la información del usuario al request
    req.user = decoded;
    
    // 4. Continuar con el siguiente middleware/ruta
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    return res.status(500).json({ error: 'Error al verificar token' });
  }
};

// Middleware para verificar si el usuario es coordinador
const requireCoordinador = (req, res, next) => {
  if (req.user.rol !== 'coordinador') {
    return res.status(403).json({ error: 'Se requieren permisos de coordinador' });
  }
  next();
};

module.exports = { verifyToken, requireCoordinador };