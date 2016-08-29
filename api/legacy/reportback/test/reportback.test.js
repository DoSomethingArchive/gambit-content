var assert = require('assert')
  , reportback = require('../')
  , connectionOperations = rootRequire('config/connectionOperations')
  , model = require('../reportbackModel')(connectionOperations)
  , emitter = rootRequire('lib/eventEmitter')
  , dscontentapi = rootRequire('lib/phoenix')()
  ;

function test() {
  var TEST_PHONE = '15555555555'
    , TEST_CAMPAIGN_CONFIG = app.getConfig(app.ConfigName.REPORTBACK, 'test', 'endpoint')
    , TEST_CAMPAIGN_CONFIG_2 = app.getConfig(app.ConfigName.REPORTBACK, 'test2', 'endpoint')
    ;

  var removeTestDocs = function() {
    model.remove({phone: TEST_PHONE}).exec();
  };

  describe('reportback.findDocument', function() {
    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

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

    after(removeTestDocs);
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

    after(removeTestDocs);
  });

  describe('reportback.receivePhoto - when no photo is sent', function() {
    it('should respond with the "not a photo" message', function(done) {
      var testData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG
      };
      var testDoc;
      before(function(done) {
        model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
          if (doc) {
            testDoc = doc;
            done();
          }
        });
      });

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
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      mms_image_url: 'http://test.url'
    };
    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

    it('should respond with the "caption" message', function(done) {
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
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_caption) {
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
      removeTestDocs();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });

  describe('reportback.receiveCaption - with a value of "test caption"', function() {
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: 'test caption'
    };
    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

    it('should respond with the "quantity" message and update reportback doc with "test caption"', function(done) {

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
          if (doc && doc.caption == testData.args) {
            onSuccessfulEvent(emitter.events.reportbackModelUpdate);
          }
          else {
            assert(false);
          }
        });
      });

      // Call receiveCaption with test data
      reportback.receiveCaption(testDoc, testData);
    });

    after(function() {
      removeTestDocs();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });

  describe('reportback.receiveQuantity - receives invalid quantity value', function() {

    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: 'this is not a number in any way'
    };

    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

    it('should respond with the "quantity sent invalid" message', function(done) {
      emitter.on(emitter.events.mcProfileUpdateTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_quantity_sent_invalid) {
          done();
        }
        else {
          assert(false);
        }
      });

      // If model is updated, test fails. 
      emitter.on(emitter.events.reportbackModelUpdate, function() {
        assert(false);
      });

      // Call receiveQuantity with test data
      reportback.receiveQuantity(testDoc, testData);
    })

    after(function() {
      removeTestDocs();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });

  })

  describe('reportback.receiveQuantity - with a value of 5', function() {
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: '5'
    };
    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

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
      removeTestDocs();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });

  describe('reportback.receiveWhyImportant - with a value of "because I care"', function() {
    var testData = {
      phone: TEST_PHONE,
      campaignConfig: TEST_CAMPAIGN_CONFIG,
      args: 'because I care'
    };
    var testDoc;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
        if (doc) {
          testDoc = doc;
          done();
        }
      });
    });

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
        var shortenedLink = (reportback.REPORTBACK_PERMALINK_BASE_URL + dscontentapi.TEST_RBID).replace(/.*?:\/\//g, "");
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.opt_in_path_id == TEST_CAMPAIGN_CONFIG.message_complete &&
            evtData.form.last_reportback_url == shortenedLink) { 
          onSuccessfulEvent(emitter.events.mcProfileUpdateTest);
        }
        else {
          assert(false);
        }
      });

      // Check if correct campaign id opt-out is sent
      emitter.on(emitter.events.mcOptoutTest, function(evtData) {
        if (evtData.form.phone_number == testData.phone &&
            evtData.form.campaign_id == TEST_CAMPAIGN_CONFIG.campaign_optout_id) {
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
      removeTestDocs();
      emitter.removeAllListeners(emitter.events.mcProfileUpdateTest);
      emitter.removeAllListeners(emitter.events.mcOptoutTest);
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    });
  });
  describe('A single user not finishing her reportback for one campaign before reporting back for another', function() {

    // Documents updated as we simulate a user moving through the rb flow.
    var testDoc1, testDoc2;
    before(function(done) {
      model.create({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, {phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG_2.endpoint}, function(err, doc1, doc2) {
        if (doc1 && doc2) {
          testDoc1 = doc1;
          testDoc2 = doc2;
          done();
        }
      });
    })

    afterEach(function() {
      emitter.removeAllListeners(emitter.events.reportbackModelUpdate);
    })

    it('should allow a user to send a photo for test campaign 1', function(done) {
      var photoData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG,
        mms_image_url: 'http://test1.url'
      };

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
          if (doc && doc.photo == photoData.mms_image_url) {
            testDoc1 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc1, photoData);
    })

    it('should allow a user to send a caption for test campaign 1', function(done) {
      var captionData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG,
        args: 'The arc of history is long but it bends towards justice'
      }

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
          if (doc && doc.caption == captionData.args) {
            testDoc1 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc1, captionData);
    })

    it('should allow a user to send in a quantity for test campaign 1', function(done) {
      var quantityData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG,
        args: 888888888
      }

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG.endpoint}, function(err, doc) {
          if (doc && doc.quantity == quantityData.args) {
            testDoc1 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc1, quantityData);
    })

    it('should allow a user to send a photo for test campaign 2', function(done) {
      var photoData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG_2,
        mms_image_url: 'http://testcampaigntwo.url'
      };

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG_2.endpoint}, function(err, doc) {
          if (doc && doc.photo == photoData.mms_image_url) {
            testDoc2 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc2, photoData);
    })

    it('should allow a user to send a caption for test campaign 2', function(done) {
      var captionData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG_2,
        args: 'Friends, Romans, countrymen lend me your ears!'
      }

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG_2.endpoint}, function(err, doc) {
          if (doc && doc.caption == captionData.args) {
            testDoc2 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc2, captionData);
    })

    it('should allow a user to send in a quantity for test campaign 2', function(done) {
      var quantityData = {
        phone: TEST_PHONE,
        campaignConfig: TEST_CAMPAIGN_CONFIG_2,
        args: 777777777
      }

      emitter.on(emitter.events.reportbackModelUpdate, function(evtData) {
        model.findOne({phone: TEST_PHONE, campaign: TEST_CAMPAIGN_CONFIG_2.endpoint}, function(err, doc) {
          if (doc && doc.quantity == quantityData.args) {
            testDoc2 = doc;
            done();
          }
        })
      })
      reportback.handleUserResponse(testDoc2, quantityData);
    })

    after(removeTestDocs);
  })
};

module.exports = test;