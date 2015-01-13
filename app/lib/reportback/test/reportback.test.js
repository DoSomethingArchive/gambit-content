var assert = require('assert')
  , reportback = require('../')
  , connectionOperations = rootRequire('app/config/connectionOperations')
  , model = require('../reportbackModel')(connectionOperations)
  , emitter = rootRequire('app/eventEmitter')
  ;

function test() {
  var TEST_PHONE = '15555555555';
  var TEST_CAMPAIGN_CONFIG = app.getConfig('reportbacks', 'test', 'endpoint');

  var createTestDoc = function() {
    model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint});
  };

  var removeTestDoc = function() {
    model.remove({phone: TEST_PHONE}).exec();
  };

  describe('reportback.findDocument', function() {
    before(createTestDoc);

    it('should find the document', function(done) {
      reportback.findDocument(TEST_PHONE, TEST_CAMPAIGN_CONFIG.endpoint)
        .then(function(doc) {
          if (doc) {
            done();
          }
          else {
            assert(false);
          }
        });
    });

    after(removeTestDoc);
  });

  describe('reportback.onDocumentFound - when no existing document is found', function() {
    before(function(done) {
      reportback.onDocumentFound(null, TEST_PHONE, TEST_CAMPAIGN_CONFIG)
        .then(function(doc) {
          done();
        });
    });

    it('should create a new document', function(done) {
      model.findOne({phone: TEST_PHONE}, function(err, doc) {
        if (doc && doc.phone == TEST_PHONE) {
          done();
        }
        else {
          assert(false);
        }
      });
    });

    after(removeTestDoc);
  });

  describe('reportback.receivePhoto - when no photo is sent', function() {
    it('should respond with the "not a photo" message', function(done) {
      var testDoc = {};
      var testData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG
      };

      emitter.on(emitter.events.mcProfileUpdateTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_not_a_photo) {
          done();
        }
        else {
          assert(false);
        }
      });

      reportback.receivePhoto(testDoc, testData);
    });

    after(function() {
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
    });
  });

  describe('reportback.receivePhoto - when a photo is sent', function() {
    var testDoc = {};
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      mms_image_url: 'http://test.url'
    };

    before(createTestDoc);

    it('should respond with the "quantity" message', function(done) {
      var mcEventDone = false;
      var rbEventDone = false;
      function onSuccessfulEvent(evt) {
        if (evt == emitter.events.mcProfileUpdateTest) {
          mcEventDone = true;
        }
        else if (evt == emitter.events.reportbackModelUpdate) {
          rbEventDone = true;
        }

        if (mcEventDone && rbEventDone) {
          done();
        }
      };

      // Check if correct user is subscribed to correct opt-in path
      emitter.on(emitter.events.mcProfileUpdateTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_quantity) {
          onSuccessfulEvent(emitter.events.mcProfileUpdateTest);
        }
        else {
          assert(false);
        }
      });

      // Check if model is updated properly
      emitter.on(emitter.events.reportbackModelUpdate, function() {
        model.findOne({phone: TEST_PHONE}, function(err, doc) {
          if (doc && doc.photo == testData.mms_image_url) {
            onSuccessfulEvent(emitter.events.reportbackModelUpdate);
          }
          else {
            assert(false);
          }
        });
      });

      // Call receivePhoto with test data
      reportback.receivePhoto(testDoc, testData);
    });

    after(function() {
      removeTestDoc();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });

  describe('reportback.receiveQuantity - with a value of 5', function() {
    var testDoc = {};
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: '5'
    };

    before(createTestDoc);

    it('should respond with the "why" message and update reportback doc with 5', function(done) {
      var mcEventDone = false;
      var rbEventDone = false;
      function onSuccessfulEvent(evt) {
        if (evt == emitter.events.mcProfileUpdateTest) {
          mcEventDone = true;
        }
        else if (evt == emitter.events.reportbackModelUpdate) {
          rbEventDone = true;
        }

        if (mcEventDone && rbEventDone) {
          done();
        }
      };

      // Check if correct user is subscribed to correct opt-in path
      emitter.on(emitter.events.mcProfileUpdateTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_why) {
          onSuccessfulEvent(emitter.events.mcProfileUpdateTest);
        }
        else {
          assert(false);
        }
      });

      // Check if model is updated properly
      emitter.on(emitter.events.reportbackModelUpdate, function() {
        model.findOne({phone: TEST_PHONE}, function(err, doc) {
          if (doc && doc.quantity == testData.args) {
            onSuccessfulEvent(emitter.events.reportbackModelUpdate);
          }
          else {
            assert(false);
          }
        });
      });

      // Call receiveQuantity with test data
      reportback.receiveQuantity(testDoc, testData);
    });

    after(function() {
      removeTestDoc();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });

  describe('reportback.receiveWhyImportant - with a value of "because I care"', function() {
    var testDoc = {};
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: 'because I care'
    };

    before(createTestDoc);

    it('should respond with the "completion" message and update reportback doc with the answer and optout of the campaign', function(done) {
      var mcUpdateEventDone = false;
      var mcOptoutEventDone = false;
      var rbEventDone = false;

      function onSuccessfulEvent(evt) {
        if (evt == emitter.events.mcProfileUpdateTest) {
          mcUpdateEventDone = true;
        }
        else if (evt == emitter.events.mcOptoutTest) {
          mcOptoutEventDone = true;
        }
        else if (evt == emitter.events.reportbackModelUpdate) {
          rbEventDone = true;
        }

        if (mcUpdateEventDone && mcOptoutEventDone && rbEventDone) {
          done();
        }
      };

      // Check if correct user is subscribed to correct opt-in path
      emitter.on(emitter.events.mcProfileUpdateTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_complete) {
          onSuccessfulEvent(emitter.events.mcProfileUpdateTest);
        }
        else {
          assert(false);
        }
      });

      // Check if correct campaign id opt-out is sent
      emitter.on(emitter.events.mcOptoutTest, function(evtData) {
        if (evtData.form['person[phone]'] == testData.phone &&
            evtData.form.campaign == TEST_CAMPAIGN_CONFIG.campaign_optout_id) {
          onSuccessfulEvent(emitter.events.mcOptoutTest);
        }
        else {
          assert(false);
        }
      });

      // Check if model is updated properly
      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE}, function(err, doc) {
          if (doc && doc.why_important == testData.args) {
            onSuccessfulEvent(emitter.events.reportbackModelUpdate);
          }
          else {
            assert(false);
          }
        });
      });

      // Call receiveWhyImportant with test data
      reportback.receiveWhyImportant(testDoc, testData);
    });

    after(function() {
      removeTestDoc();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.mcOptoutTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });
};

module.exports = test;
