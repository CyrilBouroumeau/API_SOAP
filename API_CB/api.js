
require("dotenv").config();
const sqlQuery = require("./sql");
const express = require("express");
const sql = require("mssql/msnodesqlv8");//require("mssql");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;
const soap_url = process.env.SOAP_URL;
const soap_enveloppe = process.env.SOAP_ENVELOPPE;
const soap_namespace = process.env.SOAP_NAMESPACE;
console.log(soap_url);
const { create } = require('xmlbuilder2'); //serialization json -> xml
//---fichiers xml---
const fs = require("fs");
const path = require("path");

//--parseur réponse SOAP XML -> JSON (pour affichage dans console)
const { XMLParser } = require("fast-xml-parser");

app.use(express.static(path.join(__dirname, "public")));
function saveXmlToFile(blNumber, xmlContent) {
    const folderPath = path.join(__dirname, "xml");
    console.log(folderPath);

    // créer le dossier s'il n'existe pas
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const filePath = path.join(folderPath, `BL_${blNumber}_${Date.now()}.xml`);

    fs.writeFileSync(filePath, xmlContent, "utf8");

    console.log(`XML sauvegardé : ${filePath}`);
}
// -------------------------
// MSSQL
// -------------------------

const connectionString =
    "Driver={SQL Server Native Client 11.0};" +
    "Server=SRVSQLDIVA;" +
    `Database=${process.env.DB_DATABASE};` +
    "Trusted_Connection=Yes;" +
    "Encrypt=No;" +
    "TrustServerCertificate=Yes;";
// -------------------------
// connexion SQLSERVER pour test (affiche infos serveur, bdd, login) et vérifie que la config est OK
// -------------------------
async function connexiontest() {
        try {
            const pool = await sql.connect({connectionString: connectionString,driver: "msnodesqlv8"});
            const result = await pool.request().query(`
                  SELECT
                    @@SERVERNAME AS server_name,
                    DB_NAME() AS database_name,
                    SUSER_SNAME() AS login_name
                `);
            console.log("Connexion OK");
            //console.log(result.recordset[0]);
            console.table(result.recordset);
            //console.log(sqlQuery)
            await pool.close();
        } catch (err) {
            console.error(err);
        } finally {
            await sql.close();
        }
    }

    connexiontest();
// -------------------------
// Helpers XML
// -------------------------
function esc(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function boolXml(value) {
    return value ? "true" : "false";
}

// -------------------------
// Lecture SQL SRVSQLDIVA
// -------------------------
async function fetchBLToSend() {
    
    const pool = await sql.connect({connectionString,driver: "msnodesqlv8"});
    const result = await pool.request()
        //.input("status", sql.VarChar, "READY_TO_SHIP")
        .query(sqlQuery);
    //console.table(result.recordset)
    return result.recordset;
}
async function updateBLSent(row) {
    
    const pool = await sql.connect({connectionString,driver: "msnodesqlv8"});
    await pool.request()
        .input("BLNO", sql.Int, row.BLNumber)
        .input("BPNO", sql.Int, row.BPno)
        .input("DATETRAN", sql.DateTime, new Date())
        .query(`
    INSERT INTO BLTRAN (BLNO, BPNO, DATETRAN)
    VALUES (@BLNO, @BPNO, @DATETRAN)
  `);
    //console.table(result.recordset)
    return result.recordset;
}
// -------------------------
// Mapping SQL -> Schenker
// -------------------------
function mapRowToShipment(row) {
    //const datedel = new Date(row.dateliv)
    //.toISOString()
    //.replace('Z', '+00:00');
    //return {
  console.log(soap_namespace);
  const payload = {
    "soapenv:Envelope": {
      "@xmlns:soapenv": soap_enveloppe,
      "@xmlns:v1": soap_namespace,

      "soapenv:Header": {},

      "soapenv:Body": {
        "v1:getBookingRequestLand": {
          in: {
            applicationArea: {
              accessKey: process.env.SCHENKER_ACCESS_KEY,
              groupId: process.env.SCHENKER_GROUP_ID
            },

            bookingLand: {
              "@submitBooking": "false",

              barcodeRequest: {
                "@start_pos": "1",
                "@separated": "false",
                "@directThermalMedia": "false",
                "#": "A6"
              },

              barcodeRequestEmail: row.BarcodeEmail || process.env.DEFAULT_BARCODE_EMAIL,

              address: [
                {
                  name1: row.ShipperName,
                  locationType: "PHYSICAL",
                  mobilePhone: "",
                  personType: "COMPANY",
                  phone: row.ShipperPhone || "",
                  postalCode: row.ShipperPostalCode,
                  schenkerAddressId: "162050",
                  street: row.ShipperStreet,
                  street2: row.ShipperStreet2 || "",
                  city: row.ShipperCity,
                  countryCode: row.ShipperCountryCode || "FR",
                  type: "SHIPPER",
                },
                {
                  name1: row.DeliveryName,
                  email: row.DeliveryEmail || "",
                  locationType: "PHYSICAL",
                  mobilePhone: row.DeliveryMobilePhone || "",
                  personType: "COMPANY",
                  phone: row.DeliveryPhone || "",
                  postalCode: row.DeliveryPostalCode,
                  street: row.DeliveryStreet,
                  street2: row.DeliveryStreet2 || "",
                  city: row.DeliveryCity,
                  countryCode: row.DeliveryCountryCode || "FR",
                  type: "CONSIGNEE"
                }
              ],

              incoterm: "DAP",
              incotermLocation: row.DeliveryCity,
              productCode: "43",
              measurementType: "METRIC",
              customsClearance: "false",
              customsClearanceEu: "false",
              grossWeight: row.poids,
              indoorDelivery: "false",

              pickupDates: {
                pickUpDateFrom: row.DateBL || "",
                pickUpDateTo: row.DateBL || "",
              },

              reference: [
                {
                  number: row.BLNumber,
                  id: "SHIPPER_REFERENCE_NUMBER"
                },
                {
                  number: row.NumCde,
                  id: "CONSIGNEE_REFERENCE_NUMBER"
                },
                {
                  number: row.BPno,
                  id: "SHIPPER_REFERENCE_NUMBER"
                },
                {
                  number: row.BPzone,
                  id: "SHIPPER_REFERENCE_NUMBER"
                }
              ],

              handlingInstructions: row.DeliveryInstruc,
              neutralShipping: "false",
              specialCargo: "false",
              ecoNeutral: "false",
              serviceType: "D2D",

              shippingInformation: {
                shipmentPosition: {
                  dgr: "false",
                  cargoDesc: "Marchandise generale",
                  volume: row.volume,
                  grossWeight: row.poids,
                  packageType: "CT",
                  pieces: row.UM,
                  stackable: "false"
                },
                grossWeight: row.poids,
                volume: row.volume
              },

              express: "false",
              foodRelated: "false",
              heatedTransport: "false",
              homeDelivery: "false",
              measureUnit: "PIECES",
              ownPickup: "false",
              pharmaceuticals: "false",
              automatedFixDayDeliveryToBeAgreed: "false",
              pharma: "false",
              pallet: "false",
              weCare: "false",
              expressFr: "false"
            }
          }
        }
      }
    }
  };

  return create(payload).end({ prettyPrint: true });
}

 //   }

// -------------------------
// Envoi SOAP
// -------------------------
async function sendToSchenker(xml) {
    const response = await axios.post(soap_url, xml, {
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": ""
        },
        timeout: 30000
    });
    console.table(response.data);
    return response.data;
}

// -------------------------
// Traitement : 1 ligne SQL = 1 enveloppe SOAP
// -------------------------
async function processAllBL() {
    const rows = await fetchBLToSend();
    const results = [];
    let requestXml = "";
    let responseXml = "";
    let successArchivage = false;
    for (const row of rows) {
        try {
            if (row.PositionSent === 1) {         //si non envoyé on envoie à schenker
                requestXml = mapRowToShipment(row); //SQL BL en cours
               // const requestXml = buildSchenkerSoapEnvelope(shipment);
            
                responseXml = await sendToSchenker(requestXml); //"XML généré uniquement, non envoyé à Schenker"; //Bypass l'envoi en test
                //saveXmlToFile(row.BLNumber, requestXml);
                try {
                    await updateBLSent(row);
                     successArchivage = true;
                } catch (err) {
                     successArchivage = false;
                    console.error("Erreur archivage :", err);
                }
            } else {
                console.log(`BL ${row.BLNumber} déjà envoyé, pas de nouvel envoi.`);
                const responseXml = "BL déjà envoyé";
            }


            results.push({
                ...row,
                id: row.Id,
                blNumber: row.BLNumber,
                success: true,
                requestXml,
                responseXml
            });
            // archivage
  

        } catch (error) {
            results.push({
                ...row,
                id: row.Id,
                blNumber: row.BLNumber,
                success: false,
                requestXml: "",
                responseXml: error.response?.data || error.message
            });
        }
    }
    
    return results;
}

// -------------------------
// HTML : une DIV par BL
// -------------------------
app.get("/api/bl", async (req, res) => {
    try {
        const results = await processAllBL();
        res.json(results);
        console.log(results);
      /*  let html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Envoi BL Schenker</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .bl-card {
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
          }
          .success { border-left: 6px solid green; }
          .error { border-left: 6px solid red; }
          pre {
            background: #f5f5f5;
            padding: 10px;
            white-space: pre-wrap;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>Résultat des envois Schenker</h1>
    `;

        for (const item of results) {
            html += `
        <div class="bl-card ${item.success ? "success" : "error"}">
          <h2>BL ${esc(item.blNumber)}</h2>
          <p><strong>ID :</strong> ${esc(item.NumCde)}</p>
          <p><strong>ID :</strong> ${esc(item.id)}</p>
          <p><strong>Statut :</strong> ${item.success ? "Succès" : "Erreur"}</p>

          <details>
            <summary>Réponse SOAP</summary>
            <pre>${esc(item.responseXml)}</pre>
          </details>

          <details>
            <summary>XML envoyé</summary>
            <pre>${esc(item.requestXml)}</pre>
          </details>
          <div>
            <h2><strong>N°BP</strong>: ${esc(item.BPno)}</h2>
            <p><strong>Zone:</strong> ${esc(item.BPzone)}</p>
            <p>Nb Colis: ${esc(item.NbColis)}</p>
            <p>Nb Pal: ${esc(item.NbPalette)}</p>
            <p><strong> UM: ${esc(item.UM)} </strong></p>   
            <p>Poids: ${esc(item.poids)}</p>
            <p>Volume: ${esc(item.volume)}</p>
          </div>
          <div>
            <h2><strong>Client: </strong> ${esc(item.DeliveryName)}</h2>
            <p>Adresse: ${esc(item.DeliveryStreet)}</p>
            <p>Adresse cpl1: ${esc(item.DeliveryStreet2)} </p>
            <p>Adresse cpl2: ${esc(item.DeliveryStreet3)} </p>
            <p>Localité: ${esc(item.DeliveryStreet4)} </p>
            <p>Code Postal: ${esc(item.DeliveryPostalCode)}</p>
            <p>Ville: ${esc(item.DeliveryCity)}+ '  ' +Pays: ${esc(item.DeliveryCountryCode)}</p>
            <p>Tel: ${esc(item.DeliveryPhone)}</p>
            <p>Tel.Port: ${esc(item.DeliveryMobilePhone)}</p>
            <p>@mail: ${esc(item.DeliveryEmail)}</p>
            <p>Instruc.Liv: ${esc(item.DeliveryInstruc)}</p>
            
          </div>
        </div>
      `;
        }

        html += `
      </body>
      </html>
    `;

        res.send(html);*/
    } catch (err) {
        res.status(500).json("Erreur serveur : " + err.message);
    }
});

app.listen(port, () => {
    console.log("Serveur lancé sur http://localhost:" + port);
});