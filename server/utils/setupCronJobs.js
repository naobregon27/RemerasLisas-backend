/**
 * Configura los trabajos cron para mantenimiento del sistema
 */
export const setupCronJobs = () => {
  console.log('🕒 Configurando tareas programadas...');
  
  // Tarea de limpieza de archivos eliminada - causaba errores con paths con espacios
  
  console.log('✅ Tareas programadas configuradas correctamente');
};

export default setupCronJobs; 