// js/sync.js

(function(window) {
    const N8N_SYNC_URL = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook/9bade41e-a73a-479e-92cd-1d9c0e7b4899'; // La misma URL que para enviar cambios

    function showToast(message, type = 'info') {
        // Reutilizamos la función de toast que ya existe en el scope global
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[Sync Toast - ${type}]: ${message}`);
        }
    }

    async function syncPendingChanges() {
        console.log('Intentando sincronizar cambios pendientes...');
        showToast('☁️ Buscando cambios para sincronizar...', 'info');

        try {
            const pendingChanges = await window.db.getPendingChanges();

            if (pendingChanges.length === 0) {
                console.log('No hay cambios pendientes para sincronizar.');
                return;
            }

            showToast(`☁️ Sincronizando ${pendingChanges.length} cambio(s)...`, 'info');

            for (const change of pendingChanges) {
                try {
                    const response = await fetch(N8N_SYNC_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Aquí podrías añadir el token de autenticación si tu webhook lo requiere para la sincronización
                            // 'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
                        },
                        body: JSON.stringify(change)
                    });

                    // Si la respuesta del servidor es exitosa (ej: 200 OK, 204 No Content),
                    // asumimos que el webhook procesó el dato y lo borramos localmente.
                    if (response.ok) {
                        await window.db.deleteChange(change.id);
                        console.log(`Cambio ${change.id} sincronizado y eliminado de la cola.`);
                        showToast(`✅ Un cambio ha sido sincronizado.`, 'success');
                    } else {
                        // Si el servidor devuelve un error (4xx, 5xx), lo registramos pero no paramos el bucle.
                        // El cambio se quedará en la cola para el siguiente intento.
                        const errorText = await response.text();
                        console.error(`Error del servidor al sincronizar el cambio ${change.id}:`, response.status, errorText);
                        showToast(`⚠️ Error del servidor (${response.status}) al sincronizar.`, 'error');
                    }
                } catch (networkError) {
                    // Si hay un error de red (ej: sin conexión), paramos el bucle y lo reintentamos más tarde.
                    console.error('Error de red durante la sincronización. Se reintentará más tarde.', networkError);
                    showToast('🔌 Error de red. La sincronización se detuvo.', 'warning');
                    return; // Salimos de la función para no seguir intentando si no hay red
                }
            }

            showToast('✨ Sincronización completada.', 'success');

        } catch (dbError) {
            console.error('Error al obtener los cambios de la base de datos local:', dbError);
        }
    }

    // --- Lógica para detectar conexión --- 

    // 1. Sincronizar al cargar la app si hay conexión
    if (navigator.onLine) {
        syncPendingChanges();
    }

    // 2. Añadir listeners para detectar cuando el estado de la conexión cambia
    window.addEventListener('online', syncPendingChanges);
    window.addEventListener('load', () => {
        // También nos aseguramos de que la DB esté lista antes de cualquier operación
        if (window.db && typeof window.db.initDB === 'function') {
            // La DB ya se inicializa sola, pero podemos registrar la sincronización aquí también
        } else {
            console.error('El script de la base de datos (db.js) no se ha cargado correctamente.');
        }
    });

    // Exponer la función de sincronización por si queremos llamarla manualmente (ej: con un botón)
    window.sync = {
        syncPendingChanges
    };

})(window);
