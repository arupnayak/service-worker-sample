const CACHE_NAME = "sample-cache"

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
            "/",
            "/index.html",
            "/favicon.ico",
            "/manifest.json",
            '/jquery-3.4.1.min.js',
            "/static/js/bundle.js",
        ]);
        })
    );
    });

self.addEventListener('activate', event => {
    console.log('Activating new service worker...')
    event.waitUntil(self.clients.claim());
})


self.addEventListener('fetch', event => {
    console.log('Fetching:', event.request);
    if(navigator.onLine){
        console.log('online')
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
            function(response) {
                if (!response || response.status !== 200 ) {
                    return response;
                }
                
                var responseToCache = response.clone();
                console.log({request: event.request, responseToCache})

                if(event.request.method == 'GET' ){
                  caches.open(CACHE_NAME)
                      .then(function(cache) {
                          cache.put(event.request, responseToCache);
                      });
                } else {
                  console.log("Not cached", event.request.url)
                }

                return response;
            }
        );
    } else {
        console.log({caches})
        event.respondWith(
            caches.match(event.request).then(function(response) {
                if (response) {
                    return response;
                }
            })
        );
    }
});


const registerPeriodicNewsCheck = async() => {
  const status = await navigator.permissions.query({
    name: 'periodic-background-sync',
  });
  if (status.state === 'granted') {
    // Periodic background sync can be used.
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      try {
        await registration.periodicSync.register('content-sync', {
          // An interval of one day.
          minInterval: 24 * 60 * 60 * 1000,
        });
      } catch (error) {
        // Periodic background sync cannot be used.
      }
    }
  } else {
    // Periodic background sync cannot be used.
  }
}


registerPeriodicNewsCheck()

const skipDownloadingLatestNewsOnPageLoad = () => {
  console.log("Latest news already downloaded");
};

const getLatestNews = () => {
  console.log("Downloading latest news");
};

async function syncResultsFor({ request, response }, name, transform = item => item) {
  let createNameSingle = `create${name}`;
  if (response && response.data && response.data[createNameSingle] && response.data[createNameSingle][name]) {
    syncItem(transform(response.data[createNameSingle][name]), `${name.toLowerCase()}s`);
  }
  let updateNameSingle = `update${name}`;
  if (response && response.data && response.data[updateNameSingle] && response.data[updateNameSingle][name]) {
    syncItem(transform(response.data[updateNameSingle][name]), `${name.toLowerCase()}s`);
  }
  let updateNamePlural = `update${name}s`;
  if (response && response.data && response.data[updateNamePlural] && response.data[updateNamePlural][name + "s"]) {
    response.data[updateNamePlural][name + "s"].forEach(item => syncItem(transform(item), `${name.toLowerCase()}s`));
  }
  let deleteNameSingle = `delete${name}`;
  if (response && response.data && response.data[deleteNameSingle]) {
    let reqJson = await request.json();
    deleteItem(reqJson.variables._id, name.toLowerCase() + "s");
  }
}

function syncItem(item, table, transform = item => item) {
  let open = indexedDB.open("books", 1);

  return new Promise(res => {
    open.onsuccess = evt => {
      let db = open.result;
      let tran = db.transaction(table, "readwrite");
      let objStore = tran.objectStore(table);
      objStore.get(item._id).onsuccess = ({ target: { result: itemToUpdate } }) => {
        if (!itemToUpdate) {
          objStore.add(transform(item)).onsuccess = res;
        } else {
          Object.assign(itemToUpdate, transform(item));
          objStore.put(itemToUpdate).onsuccess = res;
        }
      };
    };
  });
}

function deleteItem(_id, table) {
  let open = indexedDB.open("books", 1);

  return new Promise(res => {
    open.onsuccess = evt => {
      let db = open.result;
      let tran = db.transaction(table, "readwrite");
      let objStore = tran.objectStore(table);
      objStore.delete(_id).onsuccess = res;
    };
  });
}


const sendOutboxMessages = () => {
  console.log("Sending messages")
}

async function syncMessagesLater() {
  const registration = await navigator.serviceWorker.ready;
  try {
    await registration.sync.register("sync-messages");
  } catch {
    console.log("Background Sync could not be registered!");
  }
}

// window.document.getElementById("sync").addEventListener("click", syncMessagesLater);
// window.document.getElementById("verify").addEventListener("click", verifyTags);

const verifyTags = () => {
  navigator.serviceWorker.ready.then((registration) => {
    registration.sync.getTags().then((tags) => {
      if (tags.includes("sync-messages"))
        console.log("Messages sync already requested");
    });
  });
}


self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(sendOutboxMessages());
  }
});


