require("dotenv").config();
const sql = require("mssql");
const axios = require("axios");
const { XMLBuilder } = require("fast-xml-parser");

// 1) Connexion MSSQL (pool)
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: (process.env.DB_ENCRYPT || "true").toLowerCase() === "true",
        trustServerCertificate: false, // mets true seulement si tu sais pourquoi (cert autosigné)
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    requestTimeout: 30000,
};

async function fetchOrderForShipping() { //orderId en param si un BL
    const pool = await sql.connect(dbConfig);

    // Exemple : adapte à ton schéma
    // Utilise des paramètres pour éviter l'injection SQL
    const result = await pool.request()
        //.input("orderId", sql.Int, orderId) si un BL
        .query(`
      SELECT	e.DEPO,
		e.PIDT AS DateBL,
		e.PINO AS NumBL,
		mv1.CDNO AS NumCde,
		e.TIERS AS NumClient,        
		c.NOM AS NomClient,
        c.ADRCPL1 AS Adr1Client,
        c.ADRCPL2 AS Adr2Client,
        c.RUE AS RueClient,
        c.LOC AS LocClient,
        c.CPOSTAL AS CPClient,
        c.VIL AS VilClient,
		e.COLINB AS NbColis,
		e.UPAL AS NbPalette,
		e.COLINB + e.UPAL as UM,
		(	  SELECT STUFF((
		SELECT DISTINCT ', ' + CONCAT(LEFT(LIEU,5),':',CAST(BPNO AS VARCHAR))
		FROM BPDET
		WHERE BPDET.DOS=7 AND BPDET.CDNO=mv1.CDNO 
		FOR XML PATH(''), TYPE
		).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ListeBons) AS BPList
      FROM ENT e
	  INNER  JOIN CLI AS c ON c.DOS=e.DOS AND c.TIERS=e.TIERS
	  LEFT JOIN MOUV AS mv1 ON mv1.DOS=e.DOS AND mv1.BLNO=e.PINO AND mv1.TICOD=e.TICOD AND mv1.PICOD=e.PICOD AND mv1.CE2=1 AND mv1.BLLG=1
	  WHERE e.DOS=7 AND e.TICOD='C' AND e.PICOD=3 AND e.CE4=1 AND e.PIDT <= GETDATE() AND e.ETB in ('NPR','SPT') AND e.DEPO='BRI'
    `);

    if (result.recordset.length === 0) {
        throw new Error(`Il n' ya aucune Commandes <= à ce jour à expedier`);
    }
    return result.recordset;
}

// 2) Construction XML SOAP
function buildSoapEnvelope(order) {
    // IMPORTANT : les namespaces + noms des noeuds doivent coller au WSDL du transporteur
    // Ici c'est un EXEMPLE générique.
    const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        format: true,
        suppressEmptyNode: true,
    });

    const soapObj = {
        "soapenv:Envelope": {
            "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "@_xmlns:car": "http://www.schenker.com/Booking/v1_1", // à remplacer par le namespace du WSDL
            "soapenv:Header": {
                // Selon transporteur : auth dans header, WS-Security, token, etc.
                // Ex (fictif):
                // "car:AuthHeader": { "car:Username": "...", "car:Password": "..." }
            },
            "soapenv:Body": {
                "car:CreateShipmentRequest": {
                    "car:OrderId": String(order.OrderId),
                    "car:Recipient": {
                        "car:Name": order.CustomerName,
                        "car:Phone": order.Phone,
                        "car:Email": order.Email,
                    },
                    "car:Address": {
                        "car:Line1": order.Address1,
                        "car:Line2": order.Address2 || "",
                        "car:Zip": order.Zip,
                        "car:City": order.City,
                        "car:CountryCode": order.CountryCode,
                    },
                    "car:Parcels": {
                        "car:ParcelCount": Number(order.ParcelCount || 1),
                        "car:TotalWeightKg": Number(order.TotalWeightKg || 0),
                    },
                },
            },
        },
    };

    return builder.build(soapObj);
}

// 3) Envoi SOAP
async function callCarrierSoap(soapXml) {
    const soapUrl = process.env.SOAP_URL;
    const soapAction = process.env.SOAP_ACTION;

    const response = await axios.post(soapUrl, soapXml, {
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": soapAction, // parfois requis, parfois non
        },
        timeout: 30000,
        // auth: { username: "...", password: "..." } // si Basic Auth
    });

    return response.data; // XML de réponse
}

async function main() {
    try {
        const orderId = 123; // exemple
        const order = await fetchOrderForShipping(orderId);

        const soapXml = buildSoapEnvelope(order);
        console.log("SOAP XML envoyé:\n", soapXml);

        const soapResponseXml = await callCarrierSoap(soapXml);
        console.log("Réponse SOAP:\n", soapResponseXml);

        // Ici : parser la réponse, récupérer N° tracking / étiquette, puis update en base.
    } catch (err) {
        console.error("Erreur:", err.message);
        process.exitCode = 1;
    } finally {
        // Ferme le pool MSSQL proprement
        try { await sql.close(); } catch (_) { }
    }
}

main();