define(['jquery', 'log', 'underscore', 'utils'], function($, log, _, utils) {

  'use strict';

  var logger = log('lib', 'provider');

  // Base Provider
  function Provider(options){
    options = options || {};
    this.storage = options.storage || window.localStorage;
  }

  Provider.prototype = {

    simChanged: function() {
      var changed = false;
      var iccKey;
      var lastIcc;
      // Compare the last used SIM(s) to the current SIM(s).

      // TODO: Bug 942361 implement algorithm proposed at
      // https://wiki.mozilla.org/WebAPI/WebPayment/Multi-SIM#Firefox_OS_v1.4

      // Since Firefox OS 1.4 the mozPaymentProvider API does not include
      // separated properties for the ICC ID, MCC and MNC values anymore,
      // but an 'iccInfo' object containing these values and extra
      // information that allows the payment provider to deliver an
      // improved logic for the multi-SIM scenario.
      if (utils.mozPaymentProvider.iccInfo) {
        // Firefox OS version >= 1.4
        // Until Bug 942361 is done, we just take the iccInfo of the
        // first SIM.
        var paymentServiceId = '0';
        if (utils.mozPaymentProvider.iccInfo[paymentServiceId]) {
          iccKey = utils.mozPaymentProvider.iccInfo[paymentServiceId].iccId;
        }
        logger.log('got iccKey from iccInfo', iccKey);
      } else if (utils.mozPaymentProvider.iccIds) {
        // Firefox OS version < 1.4
        iccKey = utils.mozPaymentProvider.iccIds.join(';');
        logger.log('got iccKey from iccIds', iccKey);
      }

      if (iccKey) {
        lastIcc = this.storage.getItem('spa-last-icc');
        this.storage.setItem('spa-last-icc', iccKey);
        logger.log('new icc', iccKey, 'saved icc', lastIcc);
        if (lastIcc && lastIcc !== iccKey) {
          changed = true;
          logger.log('sim changed');
          utils.trackEvent({'action': 'sim change detection',
                            'label': 'Sim Changed'});
        } else {
          logger.log('sim did not change');
        }
      } else {
        logger.log('iccKey unavailable');
      }

      return changed;
    },

    prepareSim: function() {
      if (this.simChanged()) {
        // Log out if a new SIM is used.
        return this.logout();
      } else {
        // Nothing to do so return a resolved deferred.
        return $.Deferred().resolve();
      }
    },

    prepareAll: function() {
      var needsLogout = JSON.parse(this.storage.getItem('needs-provider-logout') || 'false');
      var currentUser = app.session.get('logged_in_user');
      var existingUser = this.storage.getItem('spa-user');

      logger.log('new user:', '"' + currentUser + '"',
                 'existing user:', '"' + existingUser + '"');

      if (!currentUser) {
        logger.log('user not set. Rejecting deferred');
        return $.Deferred().reject();
      }

      this.storage.setItem('spa-user', currentUser);

      if (needsLogout) {
        logger.log('Provider logout requested: do logout');
        utils.trackEvent({'action': 'provider logout requested',
                          'label': 'Provider Logout Required'});
        var that = this;
        return this.logout().done(function() {
          that.storage.setItem('needs-provider-logout', 'false');
        });
      } else if (existingUser && existingUser !== currentUser) {
        logger.log('User has changed: do logout');
        utils.trackEvent({'action': 'user change detection',
                          'label': 'User Changed'});
        return this.logout();
      } else {
        logger.log('User unchanged based on stored hash');
        return this.prepareSim();
      }
    },

    logout: function() {
      logger.log('logout called (no-op)');
      return $.Deferred().resolve();
    },
  };


  function Bango(options) {
    Provider.call(this, options);
  }

  // Bango specifics.
  Bango.prototype = Object.create(Provider.prototype);
  Bango.prototype.logout = function() {

    // Log out of Bango so that cookies are cleared.
    var url = utils.bodyData.bangoLogoutUrl;
    logger.log('Logging out of Bango at', url);
    if (url) {
      var req = $.ajax({url: url, dataType: 'script'});

      req.done(function(data, textStatus, $xhr) {
        logger.log('Bango logout responded: ' + $xhr.status);
        utils.trackEvent({'action': 'provider logout',
                          'label': 'Bango Logout Success'});
      });

      req.fail(function($xhr, textStatus, errorThrown) {
        logger.error('Bango logout failed with status=' + $xhr.status +
                      ' ; resp=' + textStatus + '; error=' + errorThrown);
        utils.trackEvent({'action': 'provider logout',
                          'label': 'Bango Logout Failure'});
      });

      return req;
    } else {
      logger.error('Bango logout url missing');
      app.error.render({errorCode: 'LOGOUT_URL_MISSING'});
      return $.Deferred().reject();
    }
  };


  function providerFactory(provider, options) {
    if (provider === 'bango') {
      return new Bango(options);
    } else {
      return new Provider(options);
    }
  }

  return {
    providerFactory: providerFactory,
    Provider: Provider,
    Bango: Bango
  };

});
