// Portada del video pitch: muestra una imagen propia y recién al hacer clic carga el reproductor
// de YouTube (versión sin cookies). Así la portada no depende del primer cuadro del video y no se
// conecta con YouTube hasta que la persona decide verlo.
function activarReproductorPitch() {
  const caja = document.getElementById("video-portada");
  if (!caja) return;
  const boton = caja.querySelector(".video-portada__boton");
  boton.addEventListener("click", () => {
    const marco = document.createElement("iframe");
    marco.className = "video-presentacion";
    marco.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(caja.dataset.youtubeId)}?rel=0&autoplay=1`;
    marco.title = "Credenciales Médicas: qué es y cómo funciona (video)";
    marco.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    marco.allowFullscreen = true;
    marco.referrerPolicy = "strict-origin-when-cross-origin";
    marco.style.border = "0";
    caja.replaceChildren(marco);
    marco.focus();
  }, { once: true });
}

activarReproductorPitch();
