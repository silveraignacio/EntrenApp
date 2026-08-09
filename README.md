# 🏋️ Entrenapp

App web sencilla y **muy liviana** (HTML + JS puro, sin frameworks ni servidor) para:

- **Generar rutinas full body de 2 o 3 días** con ejercicios distintos cada vez que pulses *Generar*.
- **Anotar el peso y las reps** que usas en cada ejercicio.
- **Registrar sesiones** — qué ejercicios hiciste cada día.
- **Analizar tu progreso** — qué grupos musculares entrenas y recomendaciones para distribuir 2 días/semana.
- Guardar un **histórico** con tu progreso y tus récords (PR) por ejercicio.

Pensada para usar desde el móvil en el gimnasio. Los datos se guardan en tu propio navegador (`localStorage`); no hay cuentas ni backend.

## Cómo funciona

- **Rutina**: Elige 2 o 3 días y genera una rutina full body con ejercicios variados.
- **Sesiones**: Registra qué ejercicios hiciste cada día (puedes mezclar con la rutina o hacer tus propios ejercicios).
- **Análisis**: Ve qué grupos musculares entrenaste las últimas 2 semanas y obtén recomendaciones automáticas.
- **Histórico**: Progreso por ejercicio, con mini-gráfico y récord (PR).
- Pulsa **Generar rutina** las veces que quieras para cambiar los ejercicios (nunca se repiten dentro de una misma rutina).
- En cada ejercicio: escribe el peso y las reps → **Guardar**.

## Ejercicios

El catálogo es un subconjunto curado del dataset [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), filtrado a **máquina, polea, multipower, barra/barra Z y mancuernas** — equipamiento típico de un gimnasio moderno. 308 ejercicios con instrucciones en español.

Las animaciones se cargan bajo demanda desde ese repositorio. Atribución de medios: © Gym visual.

## Publicar en GitHub Pages

Incluye un workflow que la publica automáticamente:

1. Ve a **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Cada push publica la web en `https://<usuario>.github.io/Entrenapp/`.

También puedes abrir `index.html` directamente en el navegador (funciona sin conexión, salvo las animaciones de los ejercicios).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de la app |
| `style.css` | Estilos (tema oscuro, mobile-first) |
| `app.js` | Lógica: generar rutinas, sesiones, análisis, histórico |
| `data.js` | Catálogo de 308 ejercicios |
| `.github/workflows/deploy.yml` | Publicación automática en GitHub Pages |
