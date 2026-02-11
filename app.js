// CONFIGURACIÓN DE BASE DE DATOS (IndexedDB)
const DB_NAME = "RevistaDB";
const STORE = "articulos";
let db;

// 1. INICIALIZAR BASE DE DATOS
const request = indexedDB.open(DB_NAME, 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    // Crea el almacén de objetos si no existe
    if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    console.log("✅ BD Conectada");
    App.renderKanban(); // Cargar datos al iniciar
};

// 2. LÓGICA DE LA APLICACIÓN
const App = {
    currentId: null,

    // Subir Artículo
    addArticle: () => {
        const title = document.getElementById('inp-title').value;
        const author = document.getElementById('inp-author').value;
        const file = document.getElementById('inp-file').files[0];

        if (!file) return alert("Falta el archivo PDF");

        const transaction = db.transaction([STORE], "readwrite");
        transaction.objectStore(STORE).add({
            title, author, pdfBlob: file, status: 'received', comments: ''
        });

        transaction.oncomplete = () => {
            alert("Artículo guardado ✅");
            document.getElementById('upload-form').reset();
            App.renderKanban();
        };
    },

    // Dibujar el Tablero Kanban
    renderKanban: () => {
        ['received', 'review', 'done'].forEach(s => 
            document.getElementById(`list-${s}`).innerHTML = ''
        );

        const transaction = db.transaction([STORE], "readonly");
        transaction.objectStore(STORE).openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const art = cursor.value;
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h4>${art.title}</h4><small>${art.author}</small>`;
                card.onclick = () => App.openReview(art);

                // Colocar en la columna correcta
                const colId = `list-${art.status}`;
                const col = document.getElementById(colId);
                if(col) col.appendChild(card);
                
                cursor.continue();
            }
        };
    },

    // Abrir Modo Revisión
    openReview: (art) => {
        App.currentId = art.id;
        document.getElementById('kanban-section').classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('review-section').classList.remove('hidden');

        // Mostrar PDF desde el Blob
        const url = URL.createObjectURL(art.pdfBlob);
        document.getElementById('pdf-viewer').src = url;
        document.getElementById('inp-comments').value = art.comments;

        // Si es nuevo, cambiar estado a 'review'
        if(art.status === 'received') App.updateStatus(art.id, 'review');
    },

    closeReview: () => {
        document.getElementById('review-section').classList.add('hidden');
        document.getElementById('kanban-section').classList.remove('hidden');
        document.getElementById('upload-section').classList.remove('hidden');
        App.renderKanban();
    },

    saveProgress: () => {
        const comments = document.getElementById('inp-comments').value;
        App.updateData(App.currentId, { comments });
        alert("Guardado localmente");
    },

    finalizeReview: () => {
        const comments = document.getElementById('inp-comments').value;
        App.updateData(App.currentId, { comments, status: 'done' });
        App.closeReview();
    },

    // Helpers de BD
    updateStatus: (id, status) => App.updateData(id, { status }),
    
    updateData: (id, updates) => {
        const store = db.transaction([STORE], "readwrite").objectStore(STORE);
        store.get(id).onsuccess = (e) => {
            const data = e.target.result;
            const newData = { ...data, ...updates };
            store.put(newData);
        };
    }
};

// Event Listeners
document.getElementById('upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    App.addArticle();
});

// Detectar conexión
window.addEventListener('offline', () => {
    document.getElementById('connection-status').innerText = "🔴 Offline";
    document.getElementById('connection-status').style.color = "red";
});
window.addEventListener('online', () => {
    document.getElementById('connection-status').innerText = "🟢 Online";
    document.getElementById('connection-status').style.color = "green";
});