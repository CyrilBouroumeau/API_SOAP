module.exports =`SELECT	bl.DEPO,
		bl.ENT_ID											as id,
		bl.PINO												as BLNumber,
		shipper.NOM											as ShipperName,
		shipper.ADRCPL1										as ShipperStreet,
		shipper.ADRCPL2										as ShipperStreet2,
		shipper.CPOSTAL										as ShipperPostalCode,
		shipper.VIL											as ShipperCity,
		shipper.PAY											as CountryCode,
		shipper.TEL											as ShipperPhone,
		shipper.EMAIL										as ShipperEmail,
		bl.PIDT AS DateBL,
		mv1.CDNO AS NumCde,
		bl.TIERS											as DeliveryCustomsId,       
		c.NOM												as DeliveryName,
        c.RUE												as DeliveryStreet,
        c.ADRCPL1											as DeliveryStreet2,
        --c.LOC AS LocClient,
        c.CPOSTAL											as DeliveryPostalCode,
        c.VIL												as DeliveryCity,
		c.PAY												as DeliveryCountryCode,
		c.TEL												as DeliveryPhone,
		c.EMAIL												as DeliveryEmail,
		c.TVANO												as DeliveryVatNo,
		bl.COLINB AS NbColis,
		bl.UPAL AS NbPalette,
		bl.COLINB + bl.UPAL as UM,
		bl.VOLTOT											as Volume,
		(	  SELECT STUFF((
		SELECT DISTINCT ', ' + CONCAT(LEFT(LIEU,5),':',CAST(BPNO AS VARCHAR))
		FROM BPDET
		WHERE BPDET.DOS=7 AND BPDET.CDNO=mv1.CDNO 
		FOR XML PATH(''), TYPE
		).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ListeBons) AS BPList
      FROM ENT bl
	  INNER  JOIN CLI AS c ON c.DOS=bl.DOS AND c.TIERS=bl.TIERS
	  LEFT JOIN MOUV AS mv1 ON mv1.DOS=bl.DOS AND mv1.BLNO=bl.PINO AND mv1.TICOD=bl.TICOD AND mv1.PICOD=bl.PICOD AND mv1.CE2=1 AND mv1.BLLG=1
	  LEFT JOIN ETS as shipper ON shipper.DOS=bl.DOS AND shipper.ETB=bl.ETB
	  WHERE bl.DOS=7 AND bl.TICOD='C' AND bl.PICOD=3 AND bl.CE4=1 AND bl.PIDT <= GETDATE() AND bl.ETB in ('NPR','SPT') AND bl.DEPO='BRI' --AND PINO='307140'`;