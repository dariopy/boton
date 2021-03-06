var express = require('express');
var router = express.Router();
var request = require('request');

// configuration params. TO DO: refactor
var apigeeClientKey = '4IBddIrfdGWvZJhBXaGrGwM74rDRujYW';
var apigeeClientSecret = 'pXfxrpw2U20CByFM';
var url_auth = 'https://securesandbox.tigo.com/v1/oauth/mfs/payments/tokens';
var url_pay = 'https://securesandbox.tigo.com/v2/tigo/mfs/payments/authorizations';
var url_rd = 'https://securesandbox.tigo.com/v2/tigo/mfs/payments/transactions/PRY';
var url_callback = 'http://ec2-54-209-91-24.compute-1.amazonaws.com:3000/result'
var url_redirect = 'http://ec2-54-209-91-24.compute-1.amazonaws.com:3000/result'

var merchantId = 'TigoShop';


// load the Payment model
var Payment = require('../models/payment');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET form nuevo pago. */
router.get('/pagos', function(req, res, next) {
  res.render('pago', { title: 'Demo de Pagos' });
});

/* POST form nuevo pago. */
router.post('/pagos', function(req, res, next){
	// obtener token
	request.post(
    url_auth,
    { form: { grant_type: 'client_credentials' } },
    function (error, response, tokenBody) {
        if (!error && response.statusCode == 200) {
            console.log(tokenBody);
            // extraer token la respuesta
            var token = JSON.parse(tokenBody).accessToken;
  					// preparar payload
						var payload = {
    					"MasterMerchant": {
								"account":"0986777961",
								"pin":"1234",
								"id": merchantId
							},
							"Subscriber": {
								"account": req.body.msisdn,
								"countryCode": "595",
								"country":"PRY"
							},
							"redirectUri":url_redirect,
							"callbackUri":url_callback,
							"language":"spa",
							"OriginPayment": {
								"amount": req.body.monto,
								"currencyCode":"PYG",
								"tax":"0.00",
								"fee":"0.00"
							},
							"LocalPayment": {
								"amount": req.body.monto,
								"currencyCode":"PYG"
							},
							"merchantTransactionId": req.body.trxid
						};  					
						// post payment request
						request.post(
							url_pay,
							{ json : payload },
							function (error, response, paymentBody){
								if (!error && response.statusCode == 200) {
									console.log(paymentBody);
									// redireccionar a payment server de Tigo
									var url = paymentBody.redirectUrl;
									res.redirect(url);
								} else {
									console.error("Error: http response code " + response.statusCode);
									console.error(paymentBody);
									res.json(paymentBody);
								}
							}
							).auth(null, null, true, token); 
        };        
    }
	)
	//basic auth with client key and secret
	.auth(apigeeClientKey, apigeeClientSecret, true); 		
});

/* POST handle callback */
router.post('/result', function(req, res, next) {
  // primero log en la consola
	console.log(req.body);  
  // Grabar en BD  
  Payment.create({
		transactionStatus : req.body.transactionStatus,
    merchantTransactionId : req.body.merchantTransactionId,
		mfsTransactionId: req.body.mfsTransactionId,
		transactionCode: req.body.transactionCode
	}, function(err, payment){
				if(err)
					console.error(err);
				// get and return all the todos after you create another
				/*Payment.find(function(err, payments){
					if (err)
						res.send(err);
					res.render('dbtest', { pagos: payments});
				});*/
	});

});

/* GET resultado de pago */
router.get('/result', function(req, res, next) {  
  //por ahora solo mostrar todos los pagos  
  Payment.find(function(err, payments){
					if (err)
						res.send(err);
					res.render('result', { pagos: payments});
				});
  // buscar en BD lo que vino en el callback
});

router.get('/dbtest', function(req, res, next) {
	//display contents of db and allow creating dummy data
	Payment.find(function(err, payments){
					if (err)
						res.send(err);
					res.render('dbtest', { pagos: payments});
				});
});

router.post('/dbtest', function(req, res, next){
	// insert dummy Payment data
	var fakeId = new Date().getTime();
	Payment.create({
		transactionStatus : "Dummy",
    merchantTransactionId : fakeId,
			mfsTransactionId: "Dummy",
			transactionCode: "Dummy"
	}, function(err, payment){
				if(err)
					res.send(err);
				// get and return all the payments after you create another
				Payment.find(function(err, payments){
					if (err)
						res.send(err);
					res.render('dbtest', { pagos: payments});
				});
	});

});

// delete a payment
router.post('/revertir', function (req, res, next) {
	// obtener token
	request.post(
    url_auth,
    { form: { grant_type: 'client_credentials' } },
    function (error, response, tokenBody) {
    	if (!error && response.statusCode == 200) {
            console.log(tokenBody);
            // extraer token de la respuesta
            var token = JSON.parse(tokenBody).accessToken;
            // DELETE request para reversar la transacción
            request.delete(
            	url_rd + '/' + merchantId + '/' + req.body.trxid,
            	function (error, response, paymentBody){
								if (!error && response.statusCode == 200) {
									console.log(paymentBody);
									// redireccionar a payment server de Tigo									
									res.json(paymentBody);
								} else {
									console.error("Error: http response code " + response.statusCode);	
									res.send("No existe pago con ese id");
								}
							}
            ).auth(null, null, true, token);
          };

    })
    //basic auth with client key and secret
		.auth(apigeeClientKey, apigeeClientSecret, true);
});

// get a payment status
router.get('/consultar', function (req, res, next) {
	// obtener token
	request.post(
    url_auth,
    { form: { grant_type: 'client_credentials' } },
    function (error, response, tokenBody) {
    	if (!error && response.statusCode == 200) {
            console.log(tokenBody);
            // extraer token de la respuesta
            var token = JSON.parse(tokenBody).accessToken;
            // GET request para obtener el objeto JSON con la transacción
            request(
            	url_rd + '/' + merchantId + '/' + req.query.trxid,
            	function (error, response, paymentBody){
								if (!error && response.statusCode == 200) {
									console.log(paymentBody);
									// redireccionar a payment server de Tigo									
									// res.json(paymentBody);
									res.render('detalle', 
										{ title: 'Demo de Pagos',
											pago: JSON.parse(paymentBody)
									 	});
								} else {
									console.error("Error: http response code " + response.statusCode);
									res.send("No existe pago con ese id");
								}
							}
            ).auth(null, null, true, token);
          };

    })
    //basic auth with client key and secret
		.auth(apigeeClientKey, apigeeClientSecret, true);	
});


module.exports = router;
