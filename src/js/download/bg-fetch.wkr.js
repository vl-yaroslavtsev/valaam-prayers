import sourceGroupsList from './sources.js';

function getSourceGroup(sourceGroupId) {
	return sourceGroupsList.find(({id}) => id === sourceGroupId);
}

async function saveData(event, {progress} = {}) {
	const records = await event.registration.matchAll();
	let index = 0;
	let sourceGroup = getSourceGroup(event.registration.id);

	const promises = records.map(async record => {
		const response = await record.responseReady;
		if (response && response.ok) {
			let url = new URL(response.url);
			let json = await response.json();
			let source = sourceGroup.get(url.origin + url.pathname);

			await source.save(json);

			if (progress) {
				broadcast({
					type: 'save:progress',
					progress: Math.floor(100 * (index + 1) / records.length)
				});
			}
			index++;
		}
	});
	await Promise.all(promises);
}

async function broadcast(message) {
	let clients = await self.clients.matchAll();
	console.log('broadcast', message, clients);
	clients.map((client) => {
		client.postMessage(message);
	});
}

self.addEventListener('install', event => {
	//self.skipWaiting();
  console.log('[Service Worker]: Installed');
});

self.addEventListener('activate', event => {
	clients.claim();
  console.log('[Service Worker]: Active', event);
});

self.addEventListener('backgroundfetchsuccess', event => {
  console.log('[Service Worker]: Background Fetch Success', event.registration);
	event.waitUntil(
    (async function() {
			let sourceGroup = getSourceGroup(event.registration.id);
			broadcast({
				type: 'save:start',
				registrationId: event.registration.id
			});
      try {
				await saveData(event, {progress: true});
				await event.updateUI({
           title: `${sourceGroup.title}: данные загружены и сохранены`
        });
				broadcast({ type:'done' });
      } catch (err) {
        console.error(err)
				broadcast({
					type:'error',
					name: err.name,
					message: err.message
				});
      }
    })()
  );
});

self.addEventListener('backgroundfetchfail', event => {
  console.log('[Service Worker]: Background Fetch Fail', event.registration);
  event.waitUntil(
    (async function() {
			let sourceGroup = getSourceGroup(event.registration.id);
      try {
        await saveData(event);
      } finally {
        await event.updateUI({
          title: `${sourceGroup.title}: ошибка загрузки: ${
            event.registration.failureReason
          }`
        });
				broadcast({
					type: 'error',
					name: event.registration.failureReason
				});
      }
    })()
  );
});

self.addEventListener('backgroundfetchabort', event => {
  console.log('[Service Worker]: Background Fetch abort', event.registration);
  event.waitUntil(
    (async function() {
      try {
        await saveData(event);
      } finally {
				broadcast({
					type: 'error',
					name: event.registration.failureReason
				});
      }
    })()
  );
});

self.addEventListener('backgroundfetchclick', (event) => {
  //const bgFetch = event.registration;
	clients.openWindow('/test/prayers.f7/dev/#view-menu:/settings/download');

  // if (bgFetch.result === 'success') {
  //   clients.openWindow('/test/prayers.f7/dev/#view-menu:/settings');
  // } else {
  //   clients.openWindow('/test/prayers.f7/dev/#view-menu:/settings/download');
  // }
});
