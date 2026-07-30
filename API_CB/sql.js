module.exports =`SELECT DISTINCT
		LTRIM(RTRIM(BLsent.BLTRAN_ID))											as Id,
		LTRIM(RTRIM(PIDT))													as DatePiece,
		LTRIM(RTRIM(bl.DEPO))												as depo,
		LTRIM(RTRIM(bl.PINO))												as BLNumber,
		LTRIM(RTRIM(BPlignes.BPNO))											as BPno,
		LTRIM(RTRIM(LEFT(BPlignes.LIEU,5)))									as BPzone,	
		LTRIM(RTRIM(shipper.NOM))											as ShipperName,
		LTRIM(RTRIM(shipper.RUE))											as ShipperStreet,
		LTRIM(RTRIM(shipper.ADRCPL1))										as ShipperStreet2,
		LTRIM(RTRIM(shipper.ADRCPL2))										as ShipperStreet3,
		LTRIM(RTRIM(shipper.LOC))											as ShipperStreet4,
		LTRIM(RTRIM(shipper.CPOSTAL))										as ShipperPostalCode,
		LTRIM(RTRIM(shipper.VIL))											as ShipperCity,
		LTRIM(RTRIM(LEFT(shipper.PAY,2)))											as ShipperCountryCode,
		CONCAT('+33',RIGHT(REPLACE(REPLACE(LTRIM(RTRIM(shipper.TEL)), ' ', ''), '.', ''),9))		as ShipperPhone,
		LTRIM(RTRIM(shipper.EMAIL))										as ShipperEmail,
		CASE WHEN shipper.ETB='NPR' THEN '162050'
			WHEN shipper.ETB='SPT' THEN '162051'
			WHEN shipper.ETB='BRI' THEN '162052' ELSE ' ' END	as Shippercode,

		LTRIM(RTRIM(c.NOM))												as DeliveryName,
        LTRIM(RTRIM(c.RUE))												as DeliveryStreet,
        LTRIM(RTRIM(c.ADRCPL1))											as DeliveryStreet2,
		LTRIM(RTRIM(c.ADRCPL2))											as DeliveryStreet3,
		LTRIM(RTRIM(c.LOC))												as DeliveryStreet4,
        LTRIM(RTRIM(c.CPOSTAL))											as DeliveryPostalCode,
        LTRIM(RTRIM(c.VIL))												as DeliveryCity,
		LTRIM(RTRIM(LEFT(c.PAY,2)))												as DeliveryCountryCode,
		CASE WHEN SUBSTRING(LEFT(LTRIM(RTRIM(c.TEL)),2),2,1) in ('6','7')  THEN CONCAT('+33',RIGHT(REPLACE(REPLACE(LTRIM(RTRIM(c.TEL)), ' ', ''), '.', ''),9))
			ELSE ' ' END
					as DeliveryMobilePhone,
		CASE WHEN SUBSTRING(LEFT(LTRIM(RTRIM(c.TEL)),2),2,1) not in ('6','7')  THEN CONCAT('+33',RIGHT(REPLACE(REPLACE(LTRIM(RTRIM(c.TEL)), ' ', ''), '.', ''),9))
			ELSE ' ' END
					as DeliveryPhone,
		LTRIM(RTRIM(c.EMAIL))												as DeliveryEmail,
		LTRIM(RTRIM(c.TVANO))												as DeliveryVatNo,
		LTRIM(RTRIM(c.ULIV))												as DeliveryInstruc,
		CASE WHEN ISNULL(bl.PIDT,' ')= ' ' THEN CONVERT(varchar(23), getdate(), 126) + 'T00:00:00.000+00:00' 
			ELSE CONVERT(varchar(23), bl.PIDT, 126) + 'T00:00:00.000+00:00' END			as DateBL,
		LTRIM(RTRIM(mv1.CDNO))											as NumCde,
		LTRIM(RTRIM(bl.TIERS))											as DeliveryCustomsId,       
		CAST(bl.COLINB AS DECIMAL(10,2))										as NbColis,
		CAST(bl.UPAL AS DECIMAL(10,2))									as NbPalette,
		CAST(bl.COLINB + bl.UPAL AS DECIMAL(10,2))								as UM,
		CAST(bl.POITOT AS DECIMAL(10,2))									as poids,
		CAST(bl.VOLTOT AS DECIMAL(10,2))									as volume,
		CASE WHEN LTRIM(RTRIM(BLsent.BLNO))<>' ' THEN 2 ELSE 1 END			as PositionSent
	  FROM ENT bl
	  LEFT JOIN CLI AS c ON c.DOS=bl.DOS AND c.TIERS=bl.TIERS
	  JOIN MOUV AS mv1 ON mv1.DOS=bl.DOS AND mv1.BLNO=bl.PINO AND mv1.TICOD=bl.TICOD AND mv1.PICOD=bl.PICOD 
	  LEFT JOIN ETS as shipper ON shipper.DOS=bl.DOS AND shipper.ETB=bl.ETB
	  LEFT JOIN BPDET as BPlignes ON BPlignes.DOS=mv1.DOS AND BPlignes.CDNO=mv1.CDNO AND BPlignes.REF=mv1.REF AND BPlignes.TIERS=mv1.TIERS
	  LEFT JOIN BLTRAN as BLsent ON BLsent.BLNO=bl.PINO AND BLsent.BPNO=BPlignes.BPNO
	  WHERE bl.DOS=7 AND bl.TICOD='C' AND bl.PICOD=3 AND bl.CE4=1 AND bl.PIDT <= GETDATE() AND bl.ETB in ('NPR','SPT') AND bl.DEPO='BRI' AND bl.BLMOD='SHEK'
	  ORDER BY DatePiece, BLNumber, BPno`;