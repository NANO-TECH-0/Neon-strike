# Compartir el juego por internet

GitHub guarda el código y ejecuta las comprobaciones automáticas; Render ejecuta el servidor, la API y PostgreSQL. GitHub Pages no sirve para este proyecto porque no puede ejecutar el backend ni guardar las puntuaciones en la base de datos.

El proyecto incluye una configuración para publicarlo en Render con una aplicación web y una base de datos PostgreSQL. En el plan gratuito, el servicio prepara el esquema de la base de datos al arrancar, ya que Render no permite ejecutar un comando de predespliegue en ese plan.

1. Sube el proyecto a un repositorio privado de GitHub. No subas `.env` ni compartas sus valores; ya está excluido por `.gitignore`.
2. En GitHub, espera a que la acción **Verify** termine correctamente. En cada cambio comprobará los tipos e intentará generar la versión de producción.
3. En Render, crea un **Blueprint** nuevo y conecta ese repositorio.
4. Render detectará `render.yaml`. Revisa los recursos y confirma la creación de la aplicación y la base de datos. Al conectar el repositorio, Render podrá volver a desplegar cuando publiques cambios.
5. Cuando el despliegue termine, abre la URL pública que Render asigna al servicio y compártela con tus amigos.

La configuración usa los planes gratuitos de Render para facilitar una prueba. Pueden tener límites de disponibilidad y la base de datos gratuita puede ser temporal; revisa las condiciones vigentes de Render antes de depender de ella para conservar puntuaciones. Cada amigo jugará su propia partida; las puntuaciones se guardan en la tabla compartida.

## Inicio de sesión con Google y Facebook

El juego sigue permitiendo jugar como invitado. Para activar el inicio de sesión social:

1. Crea una aplicación OAuth para el juego en Google Cloud Console y otra en Meta for Developers.
2. En la configuración de cada proveedor, registra estas URL de retorno:
   - `https://mi-primer-juego-glzt.onrender.com/api/auth/google/callback`
   - `https://mi-primer-juego-glzt.onrender.com/api/auth/facebook/callback`
3. En **Render → mi-primer-juego → Environment**, configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID` y `FACEBOOK_CLIENT_SECRET` con los valores de tus aplicaciones. No los añadas al repositorio. `SESSION_SECRET` se genera automáticamente desde `render.yaml`.
4. Despliega de nuevo. Los botones de cada proveedor aparecerán habilitados cuando sus credenciales estén configuradas.

La primera vez que un jugador inicia sesión, el juego combina el progreso local con el guardado en su cuenta. El jugador selecciona país, región y ciudad usando las listas desplegables; su puntuación se guarda con esa ubicación para los rankings nacional, regional y de ciudad. Las puntuaciones de invitados aparecen únicamente en el ranking global.
