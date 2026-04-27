import Local from '../models/Local.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import storageConfig from '../config/storage.js';

// Comprime y convierte a base64 (igual que en tiendaPublicaController)
const comprimirParaBase64 = async (filePath, mimetype, maxWidth = 900) => {
  const tmpPath = filePath + '.b64tmp.jpg';
  try {
    await sharp(filePath)
      .resize({ width: maxWidth, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 75, progressive: true, mozjpeg: true })
      .toFile(tmpPath);
    
    const buffer = fs.readFileSync(tmpPath);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('Error al comprimir imagen para base64:', err.message);
    const buffer = fs.readFileSync(filePath);
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  } finally {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  }
};

// Función helper para verificar permisos sobre una tienda
const verificarPermisosAdmin = (tienda, usuario) => {
  console.log('Verificando permisos para:', {
    usuarioId: usuario._id,
    usuarioRole: usuario.role,
    usuarioLocalId: usuario.local ? usuario.local._id : 'No tiene local asignado',
    tiendaId: tienda._id,
    tiendaAdmin: tienda.administrador,
    tiendaNombre: tienda.nombre
  });

  // SuperAdmin siempre tiene acceso
  if (usuario.role === 'superAdmin') {
    console.log('Es superAdmin, tiene acceso');
    return true;
  }
  
  // Si es admin, verificar relación con la tienda
  if (usuario.role === 'admin') {
    // Si el usuario tiene un local asignado y coincide con esta tienda
    if (usuario.local && usuario.local._id && usuario.local._id.toString() === tienda._id.toString()) {
      console.log('Admin asignado a esta tienda - ACCESO CONCEDIDO');
      return true;
    }
    
    // Verificar si es el administrador asignado
    if (tienda.administrador && tienda.administrador.toString() === usuario._id.toString()) {
      console.log('Es el administrador de la tienda - ACCESO CONCEDIDO');
      return true;
    }
    
    // Verificar si está en la lista de empleados
    if (tienda.empleados && tienda.empleados.length > 0) {
      const esEmpleado = tienda.empleados.some(emp => emp.toString() === usuario._id.toString());
      if (esEmpleado) {
        console.log('Es empleado de la tienda - ACCESO CONCEDIDO');
        return true;
      }
    }
    
    console.log('Admin sin relación con esta tienda - ACCESO DENEGADO');
  }
  
  return false;
};

// Administrar la configuración del menú personalizado
export const actualizarMenuPersonalizado = async (req, res) => {
  try {
    const { slug } = req.params;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ msg: 'Se requiere un array de elementos para el menú' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Actualizar menú personalizado
    tienda.configuracionTienda.menuPersonalizado = items.map((item, index) => ({
      ...item,
      orden: item.orden || index
    }));
    
    // Ordenar por el campo orden
    tienda.configuracionTienda.menuPersonalizado.sort((a, b) => a.orden - b.orden);
    
    await tienda.save();
    
    return res.json({
      msg: 'Menú personalizado actualizado correctamente',
      menu: tienda.configuracionTienda.menuPersonalizado
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el menú personalizado' });
  }
};

// Configurar el pie de página
export const actualizarPiePagina = async (req, res) => {
  try {
    const { slug } = req.params;
    const { columnas, textoCopyright } = req.body;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Actualizar pie de página
    if (columnas) tienda.configuracionTienda.piePagina.columnas = columnas;
    if (textoCopyright) tienda.configuracionTienda.piePagina.textoCopyright = textoCopyright;
    
    await tienda.save();
    
    return res.json({
      msg: 'Pie de página actualizado correctamente',
      piePagina: tienda.configuracionTienda.piePagina
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el pie de página' });
  }
};

// Actualizar una sección específica
export const actualizarSeccion = async (req, res) => {
  try {
    const { slug, seccionId } = req.params;
    let { titulo, contenido, imagen, orden } = req.body;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Verificar si existen secciones
    if (!tienda.configuracionTienda.secciones || tienda.configuracionTienda.secciones.length === 0) {
      return res.status(404).json({ msg: 'No hay secciones para actualizar' });
    }
    
    // Encontrar el índice de la sección
    const seccionIndex = tienda.configuracionTienda.secciones.findIndex(
      s => s.id.toString() === seccionId
    );
    
    if (seccionIndex === -1) {
      return res.status(404).json({ msg: 'Sección no encontrada' });
    }
    
    // Si hay un archivo adjunto, comprimir y convertir a base64
    if (req.file) {
      console.log('Archivo recibido para actualizar sección:', req.file.filename);
      imagen = await comprimirParaBase64(req.file.path, req.file.mimetype, 900);
    }
    
    // Actualizar la sección
    if (titulo) tienda.configuracionTienda.secciones[seccionIndex].titulo = titulo;
    if (contenido) tienda.configuracionTienda.secciones[seccionIndex].contenido = contenido;
    if (imagen) tienda.configuracionTienda.secciones[seccionIndex].imagen = imagen;
    if (orden !== undefined) tienda.configuracionTienda.secciones[seccionIndex].orden = orden;
    
    // Ordenar secciones por el campo orden
    tienda.configuracionTienda.secciones.sort((a, b) => a.orden - b.orden);
    
    await tienda.save();
    
    return res.json({
      msg: 'Sección actualizada correctamente',
      seccion: tienda.configuracionTienda.secciones[seccionIndex]
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar la sección' });
  }
};

// Ordenar las imágenes del carrusel
export const ordenarCarrusel = async (req, res) => {
  try {
    const { slug } = req.params;
    const { orden } = req.body;
    
    if (!orden || !Array.isArray(orden)) {
      return res.status(400).json({ msg: 'Se requiere un array con el nuevo orden' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Verificar si existe el carrusel
    if (!tienda.configuracionTienda.carrusel || tienda.configuracionTienda.carrusel.length === 0) {
      return res.status(404).json({ msg: 'No hay imágenes en el carrusel' });
    }
    
    // Crear un mapa con el carrusel actual para facilitar la búsqueda
    const carruselActual = {};
    tienda.configuracionTienda.carrusel.forEach(item => {
      carruselActual[item._id.toString()] = item;
    });
    
    // Crear nuevo carrusel ordenado
    const nuevoCarrusel = orden.map((id, index) => {
      const item = carruselActual[id];
      if (item) {
        item.orden = index;
        return item;
      }
    }).filter(Boolean); // Eliminar elementos undefined
    
    // Si hay algún elemento que no está en el nuevo orden, agregarlo al final
    tienda.configuracionTienda.carrusel.forEach(item => {
      const existe = nuevoCarrusel.some(i => i._id.toString() === item._id.toString());
      if (!existe) {
        item.orden = nuevoCarrusel.length;
        nuevoCarrusel.push(item);
      }
    });
    
    tienda.configuracionTienda.carrusel = nuevoCarrusel;
    
    await tienda.save();
    
    return res.json({
      msg: 'Carrusel reordenado correctamente',
      carrusel: tienda.configuracionTienda.carrusel
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al reordenar el carrusel' });
  }
};

// Exportar la configuración completa de la tienda
export const exportarConfiguracion = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Crear objeto de configuración para exportar
    const configuracion = {
      nombre: tienda.nombre,
      configuracionTienda: tienda.configuracionTienda,
      configuracionNegocio: tienda.configuracionNegocio,
      exportadoEn: new Date()
    };
    
    return res.json(configuracion);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al exportar la configuración' });
  }
};

// Importar configuración a la tienda
export const importarConfiguracion = async (req, res) => {
  try {
    const { slug } = req.params;
    const { configuracion } = req.body;
    
    if (!configuracion) {
      return res.status(400).json({ msg: 'Se requiere la configuración a importar' });
    }
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Actualizar configuración
    if (configuracion.configuracionTienda) {
      tienda.configuracionTienda = configuracion.configuracionTienda;
    }
    
    if (configuracion.configuracionNegocio) {
      tienda.configuracionNegocio = configuracion.configuracionNegocio;
    }
    
    await tienda.save();
    
    return res.json({
      msg: 'Configuración importada correctamente',
      configuracionTienda: tienda.configuracionTienda,
      configuracionNegocio: tienda.configuracionNegocio
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al importar la configuración' });
  }
};

// Previsualizar la configuración de la tienda
export const previsualizarConfiguracion = async (req, res) => {
  try {
    const { slug } = req.params;
    const configuracionPrevia = req.body;
    
    // Buscar la tienda por slug
    const tienda = await Local.findOne({ slug });
    
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    // Verificar permisos de administración
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    // Crear una copia de la tienda con la configuración previsualizada
    const tiendaPrevisualizada = {
      _id: tienda._id,
      nombre: tienda.nombre,
      slug: tienda.slug,
      direccion: tienda.direccion,
      configuracionTienda: {
        ...tienda.configuracionTienda,
        ...configuracionPrevia
      },
      modoPrevisualización: true
    };
    
    return res.json(tiendaPrevisualizada);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al previsualizar la configuración' });
  }
};

// ── GESTIÓN DE VIDEOS ──────────────────────────────────────────────────────────

// Subir un video corto (admin)
export const subirVideo = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ msg: 'Se requiere un archivo de video' });
    }
    
    const tienda = await Local.findOne({ slug });
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    if (!verificarPermisosAdmin(tienda, req.user)) {
      // Eliminar el archivo subido si no tiene permisos
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    if (!tienda.configuracionTienda.videos) {
      tienda.configuracionTienda.videos = [];
    }
    
    const nuevoVideo = {
      url: storageConfig.getUrl('videos', req.file.filename),
      titulo: req.body.titulo || '',
      descripcion: req.body.descripcion || '',
      activo: true,
      orden: tienda.configuracionTienda.videos.length
    };
    
    tienda.configuracionTienda.videos.push(nuevoVideo);
    await tienda.save();
    
    console.log('Video subido:', req.file.filename);
    return res.status(201).json({
      msg: 'Video subido correctamente',
      video: nuevoVideo
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al subir el video' });
  }
};

// Obtener todos los videos (admin - incluye inactivos)
export const obtenerVideosAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const tienda = await Local.findOne({ slug }).select('configuracionTienda.videos administrador empleados');
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    return res.json({
      videos: tienda.configuracionTienda.videos || []
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al obtener los videos' });
  }
};

// Actualizar datos de un video (título, descripción, activo, orden)
export const actualizarVideo = async (req, res) => {
  try {
    const { slug, videoId } = req.params;
    const { titulo, descripcion, activo, orden } = req.body;
    
    const tienda = await Local.findOne({ slug });
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    const videos = tienda.configuracionTienda.videos || [];
    const idx = videos.findIndex(v => v._id.toString() === videoId);
    
    if (idx === -1) {
      return res.status(404).json({ msg: 'Video no encontrado' });
    }
    
    if (titulo !== undefined) videos[idx].titulo = titulo;
    if (descripcion !== undefined) videos[idx].descripcion = descripcion;
    if (activo !== undefined) videos[idx].activo = activo;
    if (orden !== undefined) videos[idx].orden = orden;
    
    tienda.configuracionTienda.videos = videos.sort((a, b) => a.orden - b.orden);
    await tienda.save();
    
    return res.json({
      msg: 'Video actualizado correctamente',
      video: videos[idx]
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al actualizar el video' });
  }
};

// Eliminar un video
export const eliminarVideo = async (req, res) => {
  try {
    const { slug, videoId } = req.params;
    
    const tienda = await Local.findOne({ slug });
    if (!tienda) {
      return res.status(404).json({ msg: 'Tienda no encontrada' });
    }
    
    if (!verificarPermisosAdmin(tienda, req.user)) {
      return res.status(403).json({ msg: 'No tienes permisos para administrar esta tienda' });
    }
    
    const videos = tienda.configuracionTienda.videos || [];
    const idx = videos.findIndex(v => v._id.toString() === videoId);
    
    if (idx === -1) {
      return res.status(404).json({ msg: 'Video no encontrado' });
    }
    
    // Intentar eliminar el archivo del disco
    const videoUrl = videos[idx].url;
    const filename = path.basename(videoUrl);
    const filePath = path.join(storageConfig.VIDEOS_DIR, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Archivo de video eliminado:', filename);
      }
    } catch (err) {
      console.error('Error al eliminar archivo de video del disco:', err);
    }
    
    tienda.configuracionTienda.videos.splice(idx, 1);
    await tienda.save();
    
    return res.json({ msg: 'Video eliminado correctamente' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: 'Hubo un error al eliminar el video' });
  }
}; 