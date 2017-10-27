'use strict';

module.exports = function renderTemplates() {
  return (req, res) => {
    const templateNames = Object.keys(req.campaign.templates);
    templateNames.forEach((templateName) => {
      const template = req.campaign.templates[templateName];
      template.rendered = template.raw;
    });

    return res.send({ data: req.campaign });
  };
};
