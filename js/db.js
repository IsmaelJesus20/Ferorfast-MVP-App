// js/db.js

(function() {
    let db;

    function initDB() {
        const request = indexedDB.open('reforfast_changes', 1);

        request.onerror = function(event) {
            console.error('Error al abrir IndexedDB:', event.target.errorCode);
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('Base de datos local inicializada.');
        };

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            // 'changes' será el almacén para los objetos de cambio
            const objectStore = db.createObjectStore('changes', { keyPath: 'id', autoIncrement: true });
            // Creamos un índice para poder buscar por 'timestamp' si fuera necesario
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('Almacén de objetos 'changes' creado.');
        };
    }

    function saveChange(change) {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error('La base de datos no está inicializada.');
                return reject('DB not initialized');
            }

            const transaction = db.transaction(['changes'], 'readwrite');
            const store = transaction.objectStore('changes');
            
            // Añadimos un timestamp para identificarlo y un ID temporal
            const changeToStore = {
                ...change,
                temp_id: `temp_${Date.now()}`,
                timestamp: new Date().toISOString()
            };

            const request = store.add(changeToStore);

            request.onsuccess = function() {
                console.log('Cambio guardado localmente:', changeToStore);
                resolve(changeToStore);
            };

            request.onerror = function(event) {
                console.error('Error al guardar el cambio localmente:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    function getPendingChanges() {
        return new Promise((resolve, reject) => {
            if (!db) return reject('DB not initialized');

            const transaction = db.transaction(['changes'], 'readonly');
            const store = transaction.objectStore('changes');
            const request = store.getAll();

            request.onsuccess = function() {
                resolve(request.result);
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    function deleteChange(id) {
        return new Promise((resolve, reject) => {
            if (!db) return reject('DB not initialized');

            const transaction = db.transaction(['changes'], 'readwrite');
            const store = transaction.objectStore('changes');
            const request = store.delete(id);

            request.onsuccess = function() {
                console.log(`Cambio con id ${id} eliminado de la base de datos local.`);
                resolve();
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    // Exponer las funciones al objeto global window para que sean accesibles desde otros scripts
    window.db = {
        initDB,
        saveChange,
        getPendingChanges,
        deleteChange
    };

    // Inicializar la DB al cargar el script
    initDB();
})();
