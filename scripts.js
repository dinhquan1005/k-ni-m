// Tạo cơ sở dữ liệu IndexedDB
const dbName = "mediaGalleryDB";
const storeName = "mediaStore";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Lưu dữ liệu vào IndexedDB
async function saveToDB(dataUrl, type) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const id = Date.now(); // Tạo id dựa trên thời gian hiện tại
  store.put({ id, dataUrl, type });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(id);
    transaction.onerror = (event) => reject(event.target.error);
  });
}

// Xóa dữ liệu khỏi IndexedDB
async function deleteFromDB(id) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

// Hiển thị dữ liệu từ IndexedDB
async function loadFromDB() {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// Xử lý tải lên tệp
document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");
  const galleryContainer = document.getElementById("gallery-container");

  uploadBtn.addEventListener("click", async function () {
    const files = fileInput.files;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async function (e) {
        const mediaElement = document.createElement(
          file.type.startsWith("image/") ? "img" : "video"
        );
        mediaElement.classList.add("media-item");
        mediaElement.src = e.target.result;
        if (file.type.startsWith("video/")) {
          mediaElement.controls = true;
        }

        const container = document.createElement("div");
        container.style.position = "relative";
        container.appendChild(mediaElement);

        // Thêm nút xóa
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "×";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", async function () {
          // Xóa dữ liệu từ cơ sở dữ liệu
          await deleteFromDB(Number(mediaElement.dataset.id));
          // Xóa phần tử khỏi giao diện
          galleryContainer.removeChild(container);
        });

        container.appendChild(deleteBtn);
        galleryContainer.appendChild(container);

        // Lưu dữ liệu vào IndexedDB
        const id = await saveToDB(
          e.target.result,
          file.type.startsWith("image/") ? "image" : "video"
        );
        mediaElement.dataset.id = id; // Lưu id vào thuộc tính data-id
      };
      reader.readAsDataURL(file);
    }
  });

  // Hiển thị thư viện ảnh/video
  async function displayGallery() {
    const container = document.getElementById("gallery-container");
    container.innerHTML = "";

    const mediaItems = await loadFromDB();

    mediaItems.forEach((item) => {
      const div = document.createElement("div");
      const mediaElement = document.createElement(
        item.type === "image" ? "img" : "video"
      );
      mediaElement.src = item.dataUrl;
      mediaElement.className = "media-item";

      if (item.type === "video") {
        mediaElement.controls = true;
      }

      // Thêm nút xóa
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "×";
      deleteBtn.onclick = async () => {
        await deleteFromDB(item.id);
        displayGallery(); // Hiển thị lại sau khi xóa
      };

      div.appendChild(mediaElement);
      div.appendChild(deleteBtn);
      container.appendChild(div);
    });
  }

  // Hiển thị thư viện ảnh/video khi tải trang
  displayGallery();
});
