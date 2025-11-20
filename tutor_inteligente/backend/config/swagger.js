// config/swagger.js - Configuración de Swagger/OpenAPI

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Metadata básica de la API
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Tutor Inteligente - API Documentation',
    version: '1.0.0',
    description: `
# Tutor Inteligente - Documentación de la API

Sistema automatizado para generación de quizzes educativos mediante procesamiento de lenguaje natural.

## Autenticación
La API usa **JWT (JSON Web Tokens)** para autenticación. 
- Obtén un token mediante \`POST /api/auth/login\`
- Incluye el token en el header: \`Authorization: Bearer <token>\`

## Roles de Usuario
- **Coordinador**: Acceso completo al sistema
- **Profesor**: Puede generar y gestionar sus propios quizzes

## Características Principales
- Generación automática de quizzes desde archivos (PDF, PPT, DOC)
- Sistema de quizzes interactivos en tiempo real
- Exportación a PDF
- Dashboard de métricas y analytics
    `,
    contact: {
      name: 'Soporte Tutor Inteligente',
      email: 'soporte@tutorinteligente.edu'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Servidor de desarrollo'
    },
    {
      url: 'https://tutor-inteligente.herokuapp.com',
      description: 'Servidor de producción'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      // Esquemas comunes reutilizables
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Juan Pérez' },
          usuario: { type: 'string', example: 'juan.perez' },
          correo: { type: 'string', example: 'juan@universidad.edu' },
          rol: { type: 'string', enum: ['coordinador', 'profesor'], example: 'profesor' },
          carrera: { type: 'string', example: 'Ingeniería en Software' },
          activo: { type: 'boolean', example: true }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensaje de error descriptivo' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['usuario', 'contraseña'],
        properties: {
          usuario: { type: 'string', example: 'admin' },
          contraseña: { type: 'string', example: 'admin123' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          mensaje: { type: 'string', example: 'Login exitoso' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          usuario: { 
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              nombre: { type: 'string', example: 'Coordinador Principal' },
              usuario: { type: 'string', example: 'admin' },
              rol: { type: 'string', example: 'coordinador' },
              carrera: { type: 'string', example: 'Ingeniería en Software' }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Opciones para swagger-jsdoc
const options = {
  swaggerDefinition,
  apis: [
    './routes/*.js', // Todas las rutas
    './controllers/*.js' // Y controladores para ejemplos
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi
};