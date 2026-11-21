const axios = require('axios');

/**
 * GitFlow Security & Welcome Mailer Utility
 * Supports Resend API (HTTPS-based, ideal for Vercel Serverless) with graceful local/dev fallback.
 */
async function sendSecurityWelcomeEmail({ email, username, name }) {
  if (!email || !email.includes('@')) {
    console.warn('[Mailer] Invalid email address skipped:', email);
    return { success: false, error: 'Invalid email' };
  }

  const displayName = name || username || 'Desarrollador';
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'GitFlow Security <onboarding@resend.dev>';

  const subject = '🛡️ Bienvenido a GitFlow - Notificación de Seguridad y Políticas de Uso';

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bienvenido a GitFlow</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #020617; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ GitFlow</h1>
      <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 13px; font-weight: 600;">Telemetría Ágil y Control de Integridad en Tiempo Real</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <h2 style="margin-top: 0; color: #38bdf8; font-size: 20px;">¡Hola, ${displayName}! (@${username})</h2>
      
      <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
        Te damos la bienvenida a <strong>GitFlow</strong>. Tu cuenta de desarrollador ha sido verificada y asociada correctamente con tu perfil de GitHub y este correo electrónico.
      </p>

      <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
        GitFlow es una plataforma colaborativa para sincronización instantánea de eventos push de GitHub, telemetría de commits, trazabilidad de fallos con rollback automatizado y gestión ágil de salas protegidas con códigos temporales criptográficos.
      </p>

      <!-- Security Notice Card -->
      <div style="background-color: #0f172a; border-left: 4px solid #06b6d4; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 10px 0; color: #06b6d4; font-size: 15px; font-weight: 700;">
          🔒 Normas y Políticas de Seguridad Antifraude:
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.7;">
          <li><strong>Integridad del Código:</strong> Queda estrictamente prohibido introducir código malicioso, scripts destructivos o dependencias vulnerables en los repositorios vinculados.</li>
          <li><strong>Confidencialidad:</strong> No compartas con terceros los códigos temporales de acceso a las salas (OTP) ni tus credenciales o tokens de sesión JWT.</li>
          <li><strong>Validación en QA:</strong> Todo avance crítico debe pasar por la lista de chequeo técnico y auditoría de commits antes del cierre definitivo de tareas.</li>
          <li><strong>Trazabilidad y Auditoría:</strong> Cada commit vinculado es auditado por el motor de telemetría de GitFlow para detectar daños colaterales y habilitar reversiones seguras.</li>
        </ul>
      </div>

      <p style="line-height: 1.6; color: #94a3b8; font-size: 13px;">
        Al ingresar a la plataforma, aceptas operar bajo los estándares de desarrollo seguro y respetar los repositorios compartidos con tu equipo.
      </p>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="https://git-flow-nu.vercel.app/dashboard" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block;">
          Ir al Panel de Salas
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #090d16; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">Este es un mensaje automático de seguridad generado por GitFlow.</p>
      <p style="margin: 4px 0 0 0;">Si tú no solicitaste este acceso, por favor reporta el incidente de inmediato al líder técnico de la sala.</p>
    </div>

  </div>
</body>
</html>
  `;

  const textContent = `
Bienvenido a GitFlow (@${username})!

Esta es una notificación de seguridad y bienvenida de GitFlow.
Tu cuenta ha sido vinculada correctamente con este correo electrónico.

GitFlow es una plataforma de telemetría ágil, control de commits y gestión de salas colaborativas sincronizadas con GitHub.

Políticas de Seguridad y Normas de Uso:
1. No introducir código malicioso ni comprometer la integridad del flujo de trabajo.
2. No compartir credenciales, tokens de acceso ni códigos temporales de sala.
3. Respetar los repositorios asignados y verificar los cambios antes de solicitar revisión en QA.
4. Las acciones de commits y despliegue son auditadas y registradas para prevenir fraudes.

Acceso a la plataforma: https://git-flow-nu.vercel.app/dashboard
  `.trim();

  // In test environment or test domains, avoid hitting live Resend API limits
  if (process.env.NODE_ENV === 'test' || email.endsWith('@example.com')) {
    return { success: true, simulated: true, id: 'test-mock-resend-id' };
  }

  // If Resend API key is provided, send through Resend HTTP API
  if (process.env.NODE_ENV === 'test' || email.endsWith('@example.com')) {
    return { success: true, simulated: true, id: 'test-mock-room-created-id' };
  }

  if (resendApiKey) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromEmail,
          to: [email],
          subject,
          html: htmlContent,
          text: textContent
        },
        {
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      console.log(`[Mailer] Welcome email sent successfully via Resend to ${email} (ID: ${response.data?.id})`);
      return { success: true, id: response.data?.id };
    } catch (err) {
      console.error('[Mailer Resend Error]:', err.response?.data || err.message);
      // Don't throw: fallback cleanly
      return { success: false, error: err.response?.data || err.message, fallback: true };
    }
  }

  // Graceful development / pending configuration logging fallback
  console.log(`[Mailer DEV/INFO] Welcome & security email queued for ${email} (pending RESEND_API_KEY): "${subject}"`);
  return { success: true, simulated: true };
}

/**
 * GitFlow Room Created Notification Email
 */
async function sendRoomCreatedEmail({ email, username, name, projectName, roomCode }) {
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email' };

  const displayName = name || username || 'Líder de Sala';
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'GitFlow Security <onboarding@resend.dev>';
  const subject = `🚀 Sala Creada Exitosamente: "${projectName}" en GitFlow`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Sala Creada - GitFlow</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #020617; font-size: 24px; font-weight: 800;">⚡ GitFlow</h1>
      <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 13px; font-weight: 600;">Confirmación de Creación de Sala Colaborativa</p>
    </div>
    <div style="padding: 28px 24px;">
      <h2 style="margin-top: 0; color: #38bdf8; font-size: 20px;">¡Felicitaciones, ${displayName}! (@${username})</h2>
      <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
        Has creado con éxito la sala <strong>"${projectName}"</strong> en GitFlow y has sido asignado como <strong>👑 Líder y Administrador</strong> de la misma.
      </p>
      <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: #10b981; font-size: 14px; font-weight: 700;">🔐 Tu sala está protegida con código dinámico</h3>
        <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
          Los desarrolladores que deseen unirse deberán ingresar el código OTP que se genera en la cabecera de la sala (rota cada 5 minutos por seguridad criptográfica).
        </p>
        ${roomCode ? `<div style="margin-top: 12px; font-family: monospace; font-size: 18px; color: #38bdf8; background: #1e293b; padding: 8px 14px; border-radius: 6px; display: inline-block;">Código de acceso: <strong>${roomCode}</strong></div>` : ''}
      </div>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="https://git-flow-nu.vercel.app/dashboard" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block;">
          Gestionar mi Sala
        </a>
      </div>
    </div>
    <div style="background-color: #090d16; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">Notificación automática de auditoría de GitFlow.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
¡Felicitaciones ${displayName} (@${username})!
Has creado con éxito la sala "${projectName}" en GitFlow como Líder de la sala.
Ingresa al panel para gestionar tareas y telemetría: https://git-flow-nu.vercel.app/dashboard
  `.trim();

  if (process.env.NODE_ENV === 'test' || email.endsWith('@example.com')) {
    return { success: true, simulated: true, id: 'test-mock-room-created-id' };
  }

  if (resendApiKey) {
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: fromEmail, to: [email], subject, html: htmlContent, text: textContent
      }, {
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      return { success: true, id: response.data?.id };
    } catch (err) {
      console.error('[Mailer Resend Error]:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message, fallback: true };
    }
  }

  console.log(`[Mailer DEV/INFO] Room created email queued for ${email} (pending RESEND_API_KEY): "${subject}"`);
  return { success: true, simulated: true };
}

/**
 * GitFlow Room Joined Notification Email
 */
async function sendRoomJoinedEmail({ email, username, name, projectName, role }) {
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email' };

  const displayName = name || username || 'Desarrollador';
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'GitFlow Security <onboarding@resend.dev>';
  const subject = `🤝 Te has unido a la sala: "${projectName}" en GitFlow`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Bienvenido a la Sala - GitFlow</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #020617; font-size: 24px; font-weight: 800;">⚡ GitFlow</h1>
      <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 13px; font-weight: 600;">Notificación de Incorporación a Sala</p>
    </div>
    <div style="padding: 28px 24px;">
      <h2 style="margin-top: 0; color: #38bdf8; font-size: 20px;">¡Hola, ${displayName}! (@${username})</h2>
      <p style="line-height: 1.6; color: #cbd5e1; font-size: 14px;">
        Te has incorporado exitosamente como <strong>💻 ${role || 'Miembro'}</strong> a la sala colaborativa <strong>"${projectName}"</strong>.
      </p>
      <div style="background-color: #0f172a; border-left: 4px solid #06b6d4; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: #06b6d4; font-size: 14px; font-weight: 700;">📋 Tu Flujo de Trabajo en la Sala:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.7;">
          <li>Revisa las tareas en el tablero Kanban y selecciona las asignadas a tu usuario.</li>
          <li>Cada commit que envíes a GitHub con la etiqueta de la tarea quedará registrado en la telemetría en vivo.</li>
          <li>Al terminar tu código, pasa la tarea a QA para revisión y aprobación del Líder.</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 28px 0 10px 0;">
        <a href="https://git-flow-nu.vercel.app/dashboard" style="background-color: #06b6d4; color: #020617; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block;">
          Ver Tablero de la Sala
        </a>
      </div>
    </div>
    <div style="background-color: #090d16; padding: 16px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">Notificación automática generada por GitFlow.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
¡Hola ${displayName} (@${username})!
Te has incorporado exitosamente a la sala "${projectName}" en GitFlow como ${role || 'Miembro'}.
Ingresa al tablero para colaborar con tu equipo: https://git-flow-nu.vercel.app/dashboard
  `.trim();

  if (process.env.NODE_ENV === 'test' || email.endsWith('@example.com')) {
    return { success: true, simulated: true, id: 'test-mock-room-created-id' };
  }

  if (resendApiKey) {
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: fromEmail, to: [email], subject, html: htmlContent, text: textContent
      }, {
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        timeout: 8000
      });
      return { success: true, id: response.data?.id };
    } catch (err) {
      console.error('[Mailer Resend Error]:', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message, fallback: true };
    }
  }

  console.log(`[Mailer DEV/INFO] Room joined email queued for ${email} (pending RESEND_API_KEY): "${subject}"`);
  return { success: true, simulated: true };
}

module.exports = {
  sendSecurityWelcomeEmail,
  sendRoomCreatedEmail,
  sendRoomJoinedEmail
};
