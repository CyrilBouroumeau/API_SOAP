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
     <div class="accordion mb-3" id="accordion-${esc(item.id)}">

    <div class="accordion-item border-start border-5 ${item.success ? 'border-success' : 'border-danger'}">

      <!-- HEADER -->
      <h2 class="accordion-header" id="heading-${esc(item.id)}">
        <button class="accordion-button collapsed" type="button"
          data-bs-toggle="collapse"
          data-bs-target="#collapse-${esc(item.id)}">

         <div class="row w-100 text-start align-items-center">

              <div class="col-md-1">
                <span class="badge ${item.success ? 'bg-success' : 'bg-danger'}">
                  ${item.success ? 'Succès' : 'Erreur'}
                </span>
              </div>

              <div class="col-md-1"><strong>BL</strong><br>${esc(item.blNumber)}</div>
              <div class="col-md-2"><strong>NumCde</strong><br>${esc(item.NumCde)}</div>
              <div class="col-md-2"><strong>Date</strong><br>${esc(item.DatePiece || "")}</div>
              <div class="col-md-1"><strong>BP</strong><br>${esc(item.BPno)}</div>
              <div class="col-md-1"><strong>Zone</strong><br>${esc(item.BPzone)}</div>
              <div class="col-md-3"><strong>Client</strong><br>${esc(item.DeliveryName)}</div>
              <div class="col-md-1"><strong>UM</strong><br>${esc(item.UM)}</div>

          </div>

        </button>
      </h2>

      <!-- BODY -->
      <div id="collapse-${esc(item.id)}"
           class="accordion-collapse collapse"
           

        <div class="accordion-body">

          <!-- card-body -->
          
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
                <p>N°BP : ${esc(item.BPno)}</p>
                <p>Zone : ${esc(item.BPzone)}</p>
                <p>Nb Colis : ${esc(item.NbColis)}</p>
                <p>Nb Pal : ${esc(item.NbPalette)}</p>
                <p>UM : ${esc(item.UM)}</p>
                <p>Poids : ${esc(item.poids)}</p>
                <p>Volume : ${esc(item.volume)}</p>
              </div>
            </div>

            <div class="col-md-4">
              <div class="border rounded p-3 h-100 bg-white">
                <h3 class="h6">Client</h3>
                <p>${esc(item.DeliveryName)}</p>
                <p>${esc(item.DeliveryStreet)}</p>
                <p>${esc(item.DeliveryStreet2)}</p>
                <p>${esc(item.DeliveryStreet3)}</p>
                <p>${esc(item.DeliveryStreet4)}</p>
                <p>${esc(item.DeliveryPostalCode)}</p>
                <p>${esc(item.DeliveryCity)} - ${esc(item.DeliveryCountryCode)}</p>
              </div>
            </div>

            <div class="col-md-4">
              <div class="border rounded p-3 h-100 bg-white">
                <h3 class="h6">Contact</h3>
                <p>Tél : ${esc(item.DeliveryPhone)}</p>
                <p>Portable : ${esc(item.DeliveryMobilePhone)}</p>
                <p>Email : ${esc(item.DeliveryEmail)}</p>
                <p>Instruction : ${esc(item.DeliveryInstruc)}</p>
              </div>
            </div>

          </div>

          <!-- TES ACCORDÉONS SOAP EXISTANTS -->
          <div class="accordion mt-3" id="acc-${esc(item.id)}">

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#resp-${esc(item.id)}">
                  Réponse SOAP
                </button>
              </h2>
              <div id="resp-${esc(item.id)}" class="accordion-collapse collapse">
                <div class="accordion-body">
                  <pre>${esc(item.responseXml)}</pre>
                </div>
              </div>
            </div>

            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#req-${esc(item.id)}">
                  XML envoyé
                </button>
              </h2>
              <div id="req-${esc(item.id)}" class="accordion-collapse collapse">
                <div class="accordion-body">
                  <pre>${esc(item.requestXml)}</pre>
                </div>
              </div>
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