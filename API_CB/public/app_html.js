function esc(value) {
  return String(value ?? "")
   .replaceAll("&", "&amp;")
   .replaceAll("<", "&lt;")
   .replaceAll(">", "&gt;")
   .replaceAll('"', "&quot;")
   .replaceAll("'", "&#039;");
}

function buildCard(item) {
    return `
    <div class="card mb-4 shadow-sm border-start border-5 ${item.success ? 'border-success' : 'border-danger'}">
      <div class="card-body">
        <h2 class="h5 mb-3">BL ${esc(item.blNumber)}</h2>

        <p class="mb-1"><strong>ID commande :</strong> ${esc(item.NumCde)}</p>
        <p class="mb-3">
          <strong>Statut :</strong>
          <span class="badge ${item.success ? 'bg-success' : 'bg-danger'}">
            ${item.success ? 'Succès' : 'Erreur'}
          </span>
        </p>

        <div class="row g-3">
          <div class="col-md-4">
            <div class="border rounded p-3 h-100 bg-white">
              <h3 class="h6">Expédition</h3>
              <p class="mb-1"><strong>N°BP :</strong> ${esc(item.BPno)}</p>
              <p class="mb-1"><strong>Zone :</strong> ${esc(item.BPzone)}</p>
              <p class="mb-1">Nb Colis : ${esc(item.NbColis)}</p>
              <p class="mb-1">Nb Pal : ${esc(item.NbPalette)}</p>
              <p class="mb-1"><strong>UM :</strong> ${esc(item.UM)}</p>
              <p class="mb-1">Poids : ${esc(item.poids)}</p>
              <p class="mb-0">Volume : ${esc(item.volume)}</p>
            </div>
          </div>

          <div class="col-md-4">
            <div class="border rounded p-3 h-100 bg-white">
              <h3 class="h6">Client</h3>
              <p class="mb-1"><strong>Nom :</strong> ${esc(item.DeliveryName)}</p>
              <p class="mb-1">Adresse : ${esc(item.DeliveryStreet)}</p>
              <p class="mb-1">Adresse cpl1 : ${esc(item.DeliveryStreet2)}</p>
              <p class="mb-1">Adresse cpl2 : ${esc(item.DeliveryStreet3)}</p>
              <p class="mb-1">Localité : ${esc(item.DeliveryStreet4)}</p>
              <p class="mb-1">Code Postal : ${esc(item.DeliveryPostalCode)}</p>
              <p class="mb-0">
                Ville / Pays :
                ${esc([item.DeliveryCity, item.DeliveryCountryCode].filter(Boolean).join(" - "))}
              </p>
            </div>
          </div>

          <div class="col-md-4">
            <div class="border rounded p-3 h-100 bg-white">
              <h3 class="h6">Contact</h3>
              <p class="mb-1">Tél : ${esc(item.DeliveryPhone)}</p>
              <p class="mb-1">Portable : ${esc(item.DeliveryMobilePhone)}</p>
              <p class="mb-1">Email : ${esc(item.DeliveryEmail)}</p>
              <p class="mb-0">Instruction : ${esc(item.DeliveryInstruc)}</p>
            </div>
          </div>
        </div>

        <div class="accordion mt-3" id="acc-${esc(item.id)}">
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#resp-${esc(item.id)}">
                Réponse SOAP
              </button>
            </h2>
            <div id="resp-${esc(item.id)}" class="accordion-collapse collapse">
              <div class="accordion-body">
                <pre class="mb-0">${esc(item.responseXml)}</pre>
              </div>
            </div>
          </div>

          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#req-${esc(item.id)}">
                XML envoyé
              </button>
            </h2>
            <div id="req-${esc(item.id)}" class="accordion-collapse collapse">
              <div class="accordion-body">
                <pre class="mb-0">${esc(item.requestXml)}</pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

let isLoading = false;

async function loadData(force = false) {
    if (isLoading) return;
    isLoading = true;

    const content = document.getElementById("content");

    if (force) {
        content.innerHTML = '<div class="alert alert-info">Actualisation...</div>';
    }

    try {
        const response = await fetch("/api/bl");
        const results = await response.json();

        if (!response.ok) {
            throw new Error(results.message || "Erreur serveur");
        }

        if (!results.length) {
            content.innerHTML = '<div class="alert alert-warning">Aucun résultat.</div>';
            return;
        }

        content.innerHTML = results.map(buildCard).join("");
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">Erreur : ${esc(e.message)}</div>`;
    } finally {
        isLoading = false;
    }
}

loadData();

// Actualisation automatique toutes les 30 secondes
setInterval(() => {
    loadData();
}, 30000);