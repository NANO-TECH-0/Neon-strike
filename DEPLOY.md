# Compartir el juego por internet

GitHub guarda el código y ejecuta las comprobaciones automáticas; Render ejecuta el servidor, la API y PostgreSQL. GitHub Pages no sirve para este proyecto porque no puede ejecutar el backend ni guardar las puntuaciones en la base de datos.

El proyecto incluye una configuración para publicarlo en Render con una aplicación web y una base de datos PostgreSQL. En el plan gratuito, el servicio prepara el esquema de la base de datos al arrancar, ya que Render no permite ejecutar un comando de predespliegue en ese plan.

1. Sube el proyecto a un repositorio privado de GitHub. No subas `.env` ni compartas sus valores; ya está excluido por `.gitignore`.
2. En GitHub, espera a que la acción **Verify** termine correctamente. En cada cambio comprobará los tipos e intentará generar la versión de producción.
3. En Render, crea un **Blueprint** nuevo y conecta ese repositorio.
4. Render detectará `render.yaml`. Revisa los recursos y confirma la creación de la aplicación y la base de datos. Al conectar el repositorio, Render podrá volver a desplegar cuando publiques cambios.
5. Cuando el despliegue termine, abre la URL pública que Render asigna al servicio y compártela con tus amigos.

La configuración usa los planes gratuitos de Render para facilitar una prueba. Pueden tener límites de disponibilidad y la base de datos gratuita puede ser temporal; revisa las condiciones vigentes de Render antes de depender de ella para conservar puntuaciones. Cada amigo jugará su propia partida; las puntuaciones se guardan en la tabla compartida.

## Cuentas de jugador

Los jugadores pueden crear una cuenta con un nombre de usuario y una contraseña, o continuar como invitados. Los nombres de usuario tienen de 3 a 24 letras, números o guiones bajos y no distinguen entre mayúsculas y minúsculas. Las contraseñas deben tener entre 8 y 128 caracteres y se guardan como hashes scrypt; nunca se almacenan en texto legible. Por seguridad, limita los intentos de registro e inicio de sesión. No hay recuperación de contraseña, así que los jugadores deben guardar sus credenciales.

La primera vez que un jugador inicia sesión, el juego combina el progreso local con el guardado en su cuenta. El jugador selecciona país, región y ciudad usando las listas desplegables; su puntuación se guarda con esa ubicación para los rankings nacional, regional y de ciudad. Las puntuaciones de invitados aparecen únicamente en el ranking global.
