define([
  'backbone',
  'i18n-abide-utils',
  'jquery',
  'log',
  'nunjucks',
  'templates',
  'underscore'
], function(Backbone, i18n, $, log, nunjucks, templates, _){

  'use strict';

  var logger = log('views', 'base');
  var suffix = ' | Firefox Marketplace';

  var BaseView = Backbone.View.extend({

    el: '#view',
    gettext: i18n.gettext,
    format: i18n.format,

    close: function() {
      this.stopListening();
      $(this.el).unbind();
      $(this.el).empty();
      if (this.onClose){
        this.onClose();
      }
    },

    setTitle: function setTitle(title) {
      // Update the title element in the page.
      $('title').text((title || 'Payments')  + suffix);
    },

    template: function(template, data){
      // Builds the specified template with data.
      data = data || {};
      // Add gettext to context.
      _.extend(data, {
        gettext: i18n.gettext,
        format: i18n.format
      });
      return nunjucks.render(template, data);
    },

    renderTemplate: function renderTemplate(template, data) {
      // Chainable shortcut for rendering the template.
      this.$el.html(this.template(template, data));
      // Needed in casper.
      if (window._phantom) {
        logger.log('Forcing a repaint for casper');
        this.$el.parent().toggleClass('repaint');
      }
      logger.log('Replacing $el with rendered content');
      return this;
    },

    getSelectorText: function(selector) {
      return this.$el.find(selector).text();
    },

    updateSelectorText: function(selector, text) {
      this.$el.find(selector).text(text);
      return this.$el;
    }

  });
  return BaseView;
});
