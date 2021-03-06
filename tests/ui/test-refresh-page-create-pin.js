helpers.startCasper({
  setUp: function(){
    helpers.fakeLogout();
    helpers.fakeVerification();
    helpers.fakeStartTransaction();
    helpers.fakePinData({data: {pin: false}});
    casper.on('url.changed', function () {
      helpers.injectSinon();
      helpers.fakeLogout();
      helpers.fakeVerification();
      helpers.fakePinData({data: {pin: false}});
    });
  },
  tearDown: function() {
    casper.removeAllListeners('url.changed');
  }
});

casper.test.begin('Refresh from pin creation page.', {

  test: function(test) {
    helpers.doLogin();

    casper.waitForUrl(helpers.url('create-pin'), function() {

      casper.reload(function() {
        casper.waitForUrl(helpers.url('create-pin'), function() {
          test.assertUrlMatch(/\/mozpay\/spa\/create-pin/, 'Check we reload into create-pin');
        });

        casper.waitForSelector('.pinbox', function() {
          test.assertVisible('.pinbox', 'Pin entry widget should be displayed');
        });
      });
    });

    casper.run(function() {
      test.done();
    });
  },
});
