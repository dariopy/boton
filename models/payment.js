// models/payment.js

    // load mongoose since we need it to define a model
    var mongoose = require('mongoose');

    module.exports = mongoose.model('Payment', {
      transactionStatus : String,
      merchantTransactionId : String,
			mfsTransactionId: String,
			transactionCode: String		
    });