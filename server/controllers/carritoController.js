import Carrito from '../models/Carrito.js';
import Producto from '../models/Producto.js';
import mongoose from 'mongoose';

/**
 * @desc    Obtener el carrito del usuario
 * @route   GET /api/carrito
 * @access  Privado
 */
export const getCarrito = async (req, res) => {
  try {
    let carrito = await Carrito.findOne({ usuario: req.user._id })
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock slug categoria local',
        populate: [
          { path: 'categoria', select: 'nombre' },
          { path: 'local', select: 'nombre direccion' }
        ]
      });

    if (!carrito) {
      // Si no existe el carrito, crear uno nuevo
      carrito = await Carrito.create({
        usuario: req.user._id,
        productos: [],
        local: req.user.local || null
      });
    }

    res.json(carrito);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el carrito' });
  }
};

/**
 * @desc    Agregar producto al carrito
 * @route   POST /api/carrito
 * @access  Privado
 */
export const agregarProducto = async (req, res) => {
  try {
    const { productoId, cantidad, variante } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productoId)) {
      return res.status(400).json({ mensaje: 'ID de producto inválido' });
    }

    // Verificar producto
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    if (!producto.isActive) {
      return res.status(400).json({ mensaje: 'El producto no está disponible' });
    }

    // Verificar stock
    if (producto.stock < cantidad) {
      return res.status(400).json({ 
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}` 
      });
    }

    // Buscar o crear carrito
    let carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      carrito = await Carrito.create({
        usuario: req.user._id,
        productos: [],
        local: req.user.local || producto.local
      });
    }

    // Verificar si el producto ya está en el carrito
    const productoExistente = carrito.productos.find(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (productoExistente) {
      // Actualizar cantidad
      productoExistente.cantidad += cantidad;
      productoExistente.subtotal = producto.getPrecioConDescuento() * productoExistente.cantidad;
    } else {
      // Agregar producto nuevo
      carrito.productos.push({
        producto: productoId,
        cantidad,
        variante,
        precioUnitario: producto.getPrecioConDescuento(),
        subtotal: producto.getPrecioConDescuento() * cantidad
      });
    }

    // Si el carrito no tiene local asignado, asignar el del producto
    if (!carrito.local) {
      carrito.local = producto.local;
    }

    // Guardar carrito
    await carrito.save();

    // Devolver carrito actualizado con productos populados
    const carritoActualizado = await Carrito.findById(carrito._id)
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock slug',
        populate: { path: 'categoria', select: 'nombre' }
      });

    res.json(carritoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al agregar producto al carrito' });
  }
};

/**
 * @desc    Actualizar cantidad de producto en carrito
 * @route   PUT /api/carrito/:productoId
 * @access  Privado
 */
export const actualizarCantidad = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad, variante } = req.body;

    // Validar cantidad
    if (cantidad < 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' });
    }

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      return res.status(404).json({ mensaje: 'Carrito no encontrado' });
    }

    // Buscar producto en carrito
    const productoEnCarrito = carrito.productos.find(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (!productoEnCarrito) {
      return res.status(404).json({ mensaje: 'Producto no encontrado en el carrito' });
    }

    // Verificar stock
    const producto = await Producto.findById(productoId);
    if (producto && cantidad > producto.stock) {
      return res.status(400).json({ 
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}` 
      });
    }

    if (cantidad === 0) {
      // Eliminar producto del carrito
      carrito.productos = carrito.productos.filter(
        item => 
          !(item.producto.toString() === productoId && 
          JSON.stringify(item.variante) === JSON.stringify(variante))
      );
    } else {
      // Actualizar cantidad
      productoEnCarrito.cantidad = cantidad;
      productoEnCarrito.subtotal = productoEnCarrito.precioUnitario * cantidad;
    }

    // Guardar carrito
    await carrito.save();

    // Devolver carrito actualizado
    res.json(carrito);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar cantidad' });
  }
};

/**
 * @desc    Eliminar producto del carrito
 * @route   DELETE /api/carrito/:productoId
 * @access  Privado
 */
export const eliminarProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { variante } = req.body;

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      return res.status(404).json({ mensaje: 'Carrito no encontrado' });
    }

    // Eliminar producto
    carrito.productos = carrito.productos.filter(
      item => 
        !(item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante))
    );

    // Guardar carrito
    await carrito.save();

    // Devolver carrito actualizado con productos populados
    const carritoActualizado = await Carrito.findById(carrito._id)
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock slug categoria local',
        populate: [
          { path: 'categoria', select: 'nombre' },
          { path: 'local', select: 'nombre direccion' }
        ]
      });

    res.json({ mensaje: 'Producto eliminado del carrito', carrito: carritoActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar producto del carrito' });
  }
};

/**
 * @desc    Vaciar carrito
 * @route   DELETE /api/carrito
 * @access  Privado
 */
export const vaciarCarrito = async (req, res) => {
  try {
    // Buscar carrito
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      return res.status(404).json({ mensaje: 'Carrito no encontrado' });
    }

    // Vaciar carrito
    await carrito.vaciar();

    res.json({ mensaje: 'Carrito vaciado', carrito });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al vaciar el carrito' });
  }
};

/**
 * @desc    Guardar producto para después
 * @route   POST /api/carrito/guardar/:productoId
 * @access  Privado
 */
export const guardarParaDespues = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { variante } = req.body;

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      return res.status(404).json({ mensaje: 'Carrito no encontrado' });
    }

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Buscar producto en carrito
    const productoEnCarrito = carrito.productos.find(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    // Verificar si ya está guardado
    const yaGuardado = carrito.guardados.find(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (yaGuardado) {
      return res.status(400).json({ mensaje: 'El producto ya está guardado para después' });
    }

    // Guardar para después
    carrito.guardados.push({
      producto: productoId,
      variante
    });

    // Si estaba en el carrito, quitarlo
    if (productoEnCarrito) {
      carrito.productos = carrito.productos.filter(
        item => 
          !(item.producto.toString() === productoId && 
          JSON.stringify(item.variante) === JSON.stringify(variante))
      );
    }

    // Guardar carrito
    await carrito.save();

    // Devolver carrito actualizado
    const carritoActualizado = await Carrito.findById(carrito._id)
      .populate({
        path: 'guardados.producto',
        select: 'nombre precio imagenes stock slug',
        populate: { path: 'categoria', select: 'nombre' }
      });

    res.json(carritoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al guardar producto para después' });
  }
};

/**
 * @desc    Mover de guardados al carrito
 * @route   POST /api/carrito/mover/:productoId
 * @access  Privado
 */
export const moverAlCarrito = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { variante, cantidad = 1 } = req.body;

    // Buscar carrito
    const carrito = await Carrito.findOne({ usuario: req.user._id });
    if (!carrito) {
      return res.status(404).json({ mensaje: 'Carrito no encontrado' });
    }

    // Verificar que el producto existe
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Verificar stock
    if (producto.stock < cantidad) {
      return res.status(400).json({ 
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}` 
      });
    }

    // Buscar en guardados
    const guardadoIndex = carrito.guardados.findIndex(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (guardadoIndex === -1) {
      return res.status(404).json({ mensaje: 'Producto no encontrado en guardados' });
    }

    // Quitar de guardados
    carrito.guardados.splice(guardadoIndex, 1);

    // Agregar al carrito
    const productoExistente = carrito.productos.find(
      item => 
        item.producto.toString() === productoId && 
        JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (productoExistente) {
      // Actualizar cantidad
      productoExistente.cantidad += cantidad;
      productoExistente.subtotal = producto.getPrecioConDescuento() * productoExistente.cantidad;
    } else {
      // Agregar producto nuevo
      carrito.productos.push({
        producto: productoId,
        cantidad,
        variante,
        precioUnitario: producto.getPrecioConDescuento(),
        subtotal: producto.getPrecioConDescuento() * cantidad
      });
    }

    // Guardar carrito
    await carrito.save();

    // Devolver carrito actualizado
    const carritoActualizado = await Carrito.findById(carrito._id)
      .populate({
        path: 'productos.producto',
        select: 'nombre precio imagenes stock slug',
        populate: { path: 'categoria', select: 'nombre' }
      })
      .populate({
        path: 'guardados.producto',
        select: 'nombre precio imagenes stock slug',
        populate: { path: 'categoria', select: 'nombre' }
      });

    res.json(carritoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al mover producto al carrito' });
  }
}; 