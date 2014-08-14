var os   = require('os');
var fs   = require('fs');
var path = require('path');
var _    = require('lodash');

var _defaultPrefix = '_';
var _moduleExports = _.template('module.exports.${ exports } = ${ exports };');
var _tmpModuleDir  = path.join(os.tmpDir() + '/anti-raygun');

fs.exists(tmpModuleDir, function(exits) {
  if (!exits) {
    fs.mkdirSync(tmpModuleDir);
  }
});

function _variableOrFunctionPattern(targets) {
  if (targets) {
    return '\\b(' + _.toArray(targets).join('|') + ')\\b';
  }
  return '';
}

function _prefixPattern(prefix) {
  return (prefix || defaultPrefix) + '\\w+';
}

function _combinePatterns(/* patterns */) {
  var patterns = _.filter(arguments);
  return _.map(_.filter(arguments), function(pattern) {
    return '(' + pattern +')';
  }).join('|');
}

function _exportPrivateStatements(content, options) {
  var includePattern = _variableOrFunctionPattern(options.include);
  var onlyPattern    = _variableOrFunctionPattern(options.only);
  var exportPattern  = onlyPattern || _combinePatterns(includePattern, _prefixPattern(options.prefix));
  return _.map(content.match(new RegExp(exportPattern,'g')), function(exportTarget) {
    return _moduleExports({exports : exportTarget});
  });
}

function _tmpModuleExists(tmpModule) {
  if (fs.exists(tmpModule.path)) {
    return _.isEqual(fs.readFileSync(tmpModule.path).toString(),tmpModule.content);
  }
}

function _addJsExtension(filePath, extension) {
  if (!path.extname(filePath)) {
    return filePath + '.' + (extension || 'js');
  }
  return filePath;
}

function _writeTempModule(modulePath, content) {
  var moduleName = _addJsExtension(path.normalize(modulePath).replace(new RegExp(path.sep,'g'),'_'));
  var tmpModulePath = path.join(tmpModuleDir, moduleName);
  if (! _tmpModuleExists({path: tmpModulePath, content : content})) {
    fs.writeFileSync(tmpModulePath, content);
  }
  return tmpModulePath;
}

function requirePrivate(modulePath, options) {
  var filePath          = path.join(__dirname, modulePath);
  var content           = fs.readFileSync(_addJsExtension(filePath)).toString();
  var additionalExports = _exportPrivateStatements(content, options || {});
  var extendedContent   = content + '\n;' + additionalExports.join('\n');
  var tmpFile = _writeTempModule(modulePath, extendedContent);
  return require(tmpFile);
}

module.exports = {
  requirePrivate : requirePrivate,
  cleanUp : function() {
    var antiRaygunFiles = fs.readdirSync(tmpModuleDir);
    _.each(antiRaygunFiles, function(file) {
      fs.unlink(path.join(tmpModuleDir,file));
    });
    return antiRaygunFiles;
  }
};
