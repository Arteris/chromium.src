// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var embedder = {};

// TODO(lfg) Move these functions to a common js.
window.runTest = function(testName) {
  if (!embedder.test.testList[testName]) {
    window.console.warn('Incorrect testName: ' + testName);
    embedder.test.fail();
    return;
  }

  // Run the test.
  embedder.test.testList[testName]();
};

embedder.test = {};

embedder.test.assertEq = function(a, b) {
  if (a != b) {
    window.console.warn('assertion failed: ' + a + ' != ' + b);
    embedder.test.fail();
  }
};

embedder.test.assertFalse = function(condition) {
  if (condition) {
    window.console.warn('assertion failed: false != ' + condition);
    embedder.test.fail();
  }
};

embedder.test.assertTrue = function(condition) {
  if (!condition) {
    window.console.warn('assertion failed: true != ' + condition);
    embedder.test.fail();
  }
};

embedder.test.fail = function() {
  chrome.test.sendMessage('TEST_FAILED');
};

embedder.test.succeed = function() {
  chrome.test.sendMessage('TEST_PASSED');
};


// Tests begin.

// This test verifies that the allowtransparency property cannot be changed
// once set. The attribute can only be deleted.
function testAllowTransparencyAttribute() {
  var webview = document.createElement('webview');
  webview.src = 'data:text/html,webview test';
  webview.allowtransparency = true;

  webview.addEventListener('loadstop', function(e) {
    embedder.test.assertTrue(webview.hasAttribute('allowtransparency'));
    webview.allowtransparency = false;
    embedder.test.assertTrue(webview.allowtransparency);
    embedder.test.assertTrue(webview.hasAttribute('allowtransparency'));
    webview.removeAttribute('allowtransparency');
    embedder.test.assertFalse(webview.allowtransparency);
    embedder.test.succeed();
  });

  document.body.appendChild(webview);
}

function testAPIMethodExistence() {
  var apiMethodsToCheck = [
    'back',
    'find',
    'forward',
    'canGoBack',
    'canGoForward',
    'clearData',
    'getProcessId',
    'getZoom',
    'go',
    'print',
    'reload',
    'setZoom',
    'stop',
    'stopFinding',
    'terminate',
    'executeScript',
    'insertCSS',
    'getUserAgent',
    'isUserAgentOverridden',
    'setUserAgentOverride'
  ];
  var webview = document.createElement('webview');
  webview.setAttribute('partition', arguments.callee.name);
  webview.addEventListener('loadstop', function(e) {
    for (var i = 0; i < apiMethodsToCheck.length; ++i) {
      embedder.test.assertEq('function',
                             typeof webview[apiMethodsToCheck[i]]);
    }

    // Check contentWindow.
    embedder.test.assertEq('object', typeof webview.contentWindow);
    embedder.test.assertEq('function',
                           typeof webview.contentWindow.postMessage);
    embedder.test.succeed();
  });
  webview.setAttribute('src', 'data:text/html,webview check api');
  document.body.appendChild(webview);
}

// This test verifies that assigning the src attribute the same value it had
// prior to a crash spawns off a new guest process.
function testAssignSrcAfterCrash() {
  var webview = document.createElement('webview');
  webview.setAttribute('partition', arguments.callee.name);
  var terminated = false;
  webview.addEventListener('loadstop', function(evt) {
    if (!terminated) {
      webview.terminate();
      return;
    }
    // The guest has recovered after being terminated.
    embedder.test.succeed();
  });
  webview.addEventListener('exit', function(evt) {
    terminated = true;
    webview.setAttribute('src', 'data:text/html,test page');
  });
  webview.setAttribute('src', 'data:text/html,test page');
  document.body.appendChild(webview);
}

// Makes sure 'sizechanged' event is fired only if autosize attribute is
// specified.
// After loading <webview> without autosize attribute and a size, say size1,
// we set autosize attribute and new min size with size2. We would get (only
// one) sizechanged event with size1 as old size and size2 as new size.
function testAutosizeAfterNavigation() {
  var webview = document.createElement('webview');

  var step = 1;
  var sizeChangeHandler = function(e) {
    switch (step) {
      case 1:
        // This would be triggered after we set autosize attribute.
        embedder.test.assertEq(50, e.oldWidth);
        embedder.test.assertEq(100, e.oldHeight);
        embedder.test.assertTrue(e.newWidth >= 60 && e.newWidth <= 70);
        embedder.test.assertTrue(e.newHeight >= 110 && e.newHeight <= 120);

        // Remove autosize attribute and expect webview to return to its
        // original size.
        webview.removeAttribute('autosize');
        break;
      case 2:
        // Expect 50x100.
        embedder.test.assertEq(50, e.newWidth);
        embedder.test.assertEq(100, e.newHeight);

        embedder.test.succeed();
        break;
      default:
        window.console.log('Unexpected sizechanged event, step = ' + step);
        embedder.test.fail();
        break;
    }

    ++step;
  };

  webview.addEventListener('sizechanged', sizeChangeHandler);

  webview.addEventListener('loadstop', function(e) {
    webview.setAttribute('autosize', true);
    webview.setAttribute('minwidth', 60);
    webview.setAttribute('maxwidth', 70);
    webview.setAttribute('minheight', 110);
    webview.setAttribute('maxheight', 120);
  });

  webview.style.width = '50px';
  webview.style.height = '100px';
  webview.setAttribute('src', 'data:text/html,webview test sizechanged event');
  document.body.appendChild(webview);
}

// This test verifies that if a browser plugin is in autosize mode before
// navigation then the guest starts auto-sized.
function testAutosizeBeforeNavigation() {
  var webview = document.createElement('webview');

  webview.setAttribute('autosize', 'true');
  webview.setAttribute('minwidth', 200);
  webview.setAttribute('maxwidth', 210);
  webview.setAttribute('minheight', 100);
  webview.setAttribute('maxheight', 110);

  webview.addEventListener('sizechanged', function(e) {
    embedder.test.assertEq(0, e.oldWidth);
    embedder.test.assertEq(0, e.oldHeight);
    embedder.test.assertTrue(e.newWidth >= 200 && e.newWidth <= 210);
    embedder.test.assertTrue(e.newHeight >= 100 && e.newHeight <= 110);
    embedder.test.succeed();
  });

  webview.setAttribute('src', 'data:text/html,webview test sizechanged event');
  document.body.appendChild(webview);
}

// This test verifies that a lengthy page with autosize enabled will report
// the correct height in the sizechanged event.
function testAutosizeHeight() {
  var webview = document.createElement('webview');

  webview.autosize = true;
  webview.minwidth = 200;
  webview.maxwidth = 210;
  webview.minheight = 40;
  webview.maxheight = 200;

  var step = 1;
  webview.addEventListener('sizechanged', function(e) {
    switch (step) {
      case 1:
        embedder.test.assertEq(0, e.oldHeight);
        embedder.test.assertEq(200, e.newHeight);
        // Change the maxheight to verify that we see the change.
        webview.maxheight = 50;
        break;
      case 2:
        embedder.test.assertEq(200, e.oldHeight);
        embedder.test.assertEq(50, e.newHeight);
        embedder.test.succeed();
        break;
      default:
        window.console.log('Unexpected sizechanged event, step = ' + step);
        embedder.test.fail();
        break;
    }
    ++step;
  });

  webview.src = 'data:text/html,' +
                'a<br/>b<br/>c<br/>d<br/>e<br/>f<br/>' +
                'a<br/>b<br/>c<br/>d<br/>e<br/>f<br/>' +
                'a<br/>b<br/>c<br/>d<br/>e<br/>f<br/>' +
                'a<br/>b<br/>c<br/>d<br/>e<br/>f<br/>' +
                'a<br/>b<br/>c<br/>d<br/>e<br/>f<br/>';
  document.body.appendChild(webview);
}

// This test verifies that all autosize attributes can be removed
// without crashing the plugin, or throwing errors.
function testAutosizeRemoveAttributes() {
  var webview = document.createElement('webview');

  var step = 1;
  var sizeChangeHandler = function(e) {
    switch (step) {
      case 1:
        // This is the sizechanged event for autosize.

        // Remove attributes.
        webview.removeAttribute('minwidth');
        webview.removeAttribute('maxwidth');
        webview.removeAttribute('minheight');
        webview.removeAttribute('maxheight');
        webview.removeAttribute('autosize');

        // We'd get one more sizechanged event after we turn off
        // autosize.
        webview.style.width = '500px';
        webview.style.height = '500px';
        break;
      case 2:
        embedder.test.succeed();
        break;
    }

    ++step;
  };

  webview.addEventListener('loadstop', function(e) {
    webview.minwidth = 300;
    webview.maxwidth = 700;
    webview.minheight = 600;
    webview.maxheight = 400;
    webview.autosize = true;
  });

  webview.addEventListener('sizechanged', sizeChangeHandler);

  webview.style.width = '640px';
  webview.style.height = '480px';
  webview.setAttribute('src', 'data:text/html,webview check autosize');
  document.body.appendChild(webview);
}

// This test verifies that autosize works when some of the parameters are unset.
function testAutosizeWithPartialAttributes() {
  window.console.log('testAutosizeWithPartialAttributes');
  var webview = document.createElement('webview');

  var step = 1;
  var sizeChangeHandler = function(e) {
    window.console.log('sizeChangeHandler, new: ' +
                       e.newWidth + ' X ' + e.newHeight);
    switch (step) {
      case 1:
        // Expect 300x200.
        embedder.test.assertEq(300, e.newWidth);
        embedder.test.assertEq(200, e.newHeight);

        // Change the min size to cause a relayout.
        webview.minwidth = 500;
        break;
      case 2:
        embedder.test.assertTrue(e.newWidth >= webview.minwidth);
        embedder.test.assertTrue(e.newWidth <= webview.maxwidth);

        // Tests when minwidth > maxwidth, minwidth = maxwidth.
        // i.e. minwidth is essentially 700.
        webview.minwidth = 800;
        break;
      case 3:
        // Expect 700X?
        embedder.test.assertEq(700, e.newWidth);
        embedder.test.assertTrue(e.newHeight >= 200);
        embedder.test.assertTrue(e.newHeight <= 600);

        embedder.test.succeed();
        break;
      default:
        window.console.log('Unexpected sizechanged event, step = ' + step);
        embedder.test.fail();
        break;
    }

    ++step;
  };

  webview.addEventListener('sizechanged', sizeChangeHandler);

  webview.addEventListener('loadstop', function(e) {
    webview.minwidth = 300;
    webview.maxwidth = 700;
    webview.minheight = 200;
    webview.maxheight = 600;
    webview.autosize = true;
  });

  webview.style.width = '640px';
  webview.style.height = '480px';
  webview.setAttribute('src', 'data:text/html,webview check autosize');
  document.body.appendChild(webview);
}

// This test registers two event listeners on a same event (loadcommit).
// Each of the listener tries to change some properties on the event param,
// which should not be possible.
function testCannotMutateEventName() {
  var webview = document.createElement('webview');
  var url = 'data:text/html,<body>Two</body>';
  var loadCommitACalled = false;
  var loadCommitBCalled = false;

  var maybeFinishTest = function(e) {
    if (loadCommitACalled && loadCommitBCalled) {
      embedder.test.assertEq('loadcommit', e.type);
      embedder.test.succeed();
    }
  };

  var onLoadCommitA = function(e) {
    if (e.url == url) {
      embedder.test.assertEq('loadcommit', e.type);
      embedder.test.assertTrue(e.isTopLevel);
      embedder.test.assertFalse(loadCommitACalled);
      loadCommitACalled = true;
      // Try mucking with properities inside |e|.
      e.type = 'modified';
      maybeFinishTest(e);
    }
  };
  var onLoadCommitB = function(e) {
    if (e.url == url) {
      embedder.test.assertEq('loadcommit', e.type);
      embedder.test.assertTrue(e.isTopLevel);
      embedder.test.assertFalse(loadCommitBCalled);
      loadCommitBCalled = true;
      // Try mucking with properities inside |e|.
      e.type = 'modified';
      maybeFinishTest(e);
    }
  };

  // The test starts from here, by setting the src to |url|. Event
  // listener registration works because we already have a (dummy) src set
  // on the <webview> tag.
  webview.addEventListener('loadcommit', onLoadCommitA);
  webview.addEventListener('loadcommit', onLoadCommitB);
  webview.setAttribute('src', url);
  document.body.appendChild(webview);
}

// This test verifies that the load event fires when the a new page is
// loaded.
// TODO(fsamuel): Add a test to verify that subframe loads within a guest
// do not fire the 'contentload' event.
function testContentLoadEvent() {
  var webview = document.createElement('webview');
  webview.addEventListener('contentload', function(e) {
    embedder.test.succeed();
  });
  webview.setAttribute('src', 'data:text/html,trigger navigation');
  document.body.appendChild(webview);
}

// This test registers two listeners on an event (loadcommit) and removes
// the <webview> tag when the first listener fires.
// Current expected behavior is that the second event listener will still
// fire without crashing.
function testDestroyOnEventListener() {
  var webview = document.createElement('webview');
  var url = 'data:text/html,<body>Destroy test</body>';

  var loadCommitCount = 0;
  function loadCommitCommon(e) {
    embedder.test.assertEq('loadcommit', e.type);
    if (url != e.url)
      return;
    ++loadCommitCount;
    if (loadCommitCount == 2) {
      // Pass in a timeout so that we can catch if any additional loadcommit
      // occurs.
      setTimeout(function() {
        embedder.test.succeed();
      }, 0);
    } else if (loadCommitCount > 2) {
      embedder.test.fail();
    }
  };

  // The test starts from here, by setting the src to |url|.
  webview.addEventListener('loadcommit', function(e) {
    window.console.log('loadcommit1');
    webview.parentNode.removeChild(webview);
    loadCommitCommon(e);
  });
  webview.addEventListener('loadcommit', function(e) {
    window.console.log('loadcommit2');
    loadCommitCommon(e);
  });
  webview.setAttribute('src', url);
  document.body.appendChild(webview);
}

// Tests that a <webview> that starts with "display: none" style loads
// properly.
function testDisplayNoneWebviewLoad() {
  var webview = document.createElement('webview');
  var visible = false;
  webview.style.display = 'none';
  // foobar is a privileged partition according to the manifest file.
  webview.partition = 'foobar';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.fail();
  });
  webview.addEventListener('loadstop', function(e) {
    embedder.test.assertTrue(visible);
    embedder.test.succeed();
  });
  // Set the .src while we are "display: none".
  webview.setAttribute('src', 'about:blank');
  document.body.appendChild(webview);

  setTimeout(function() {
    visible = true;
    // This should trigger loadstop.
    webview.style.display = '';
  }, 0);
}

function testDisplayNoneWebviewRemoveChild() {
  var webview = document.createElement('webview');
  var visibleAndInDOM = false;
  webview.style.display = 'none';
  // foobar is a privileged partition according to the manifest file.
  webview.partition = 'foobar';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.fail();
  });
  webview.addEventListener('loadstop', function(e) {
    embedder.test.assertTrue(visibleAndInDOM);
    embedder.test.succeed();
  });
  // Set the .src while we are "display: none".
  webview.setAttribute('src', 'about:blank');
  document.body.appendChild(webview);

  setTimeout(function() {
    webview.parentNode.removeChild(webview);
    webview.style.display = '';
    visibleAndInDOM = true;
    // This should trigger loadstop.
    document.body.appendChild(webview);
  }, 0);
}

function testExecuteScript() {
  var webview = document.createElement('webview');
  webview.addEventListener('loadstop', function() {
    webview.executeScript(
      {code:'document.body.style.backgroundColor = "red";'},
      function(results) {
        embedder.test.assertEq(1, results.length);
        embedder.test.assertEq('red', results[0]);
        embedder.test.succeed();
      });
  });
  webview.setAttribute('src', 'data:text/html,trigger navigation');
  document.body.appendChild(webview);
}

function testExecuteScriptFail() {
  var webview = document.createElement('webview');
  try {
    webview.executeScript(
        {code: 'document.body.style.backgroundColor = "red";'},
        function(results) { embedder.test.fail(); });
  }
  catch (e) {
    embedder.test.succeed();
  }
}

// This test verifies that the call of executeScript will fail and return null
// if the webview has been navigated to another source.
function testExecuteScriptIsAbortedWhenWebViewSourceIsChanged() {
  var webview = document.createElement('webview');
  var initial = true;
  var navigationOccur = false;
  var newSrc = 'data:text/html,trigger navigation';
  webview.addEventListener('loadstart', function() {
    if (initial) {
      webview.setAttribute('src', newSrc);
      navigationOccur = true;
    }
    initial = false;
  });
  webview.addEventListener('loadstop', function() {
    webview.executeScript(
      {code:'document.body.style.backgroundColor = "red";'},
      function(results) {
        if (navigationOccur) {
          // Expect a null results because the executeScript failed;
          // return "red", otherwise.
          embedder.test.assertEq(null, results);
          embedder.test.succeed();
        }
        navigationOccur = false;
      }
    );
  });
  webview.setAttribute('src', "about:blank");
  document.body.appendChild(webview);
}

function testFindAPI() {
  var webview = new WebView();
  webview.src = 'data:text/html,Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br><br>' +
      '<a href="about:blank">Click here!</a>';

  var loadstopListener2 = function(e) {
    embedder.test.assertEq(webview.src, "about:blank");
    embedder.test.succeed();
  }

  var loadstopListener1 = function(e) {
    // Test find results.
    webview.find("dog", {}, function(results) {
      callbackTest = true;
      embedder.test.assertEq(results.numberOfMatches, 100);
      embedder.test.assertTrue(results.selectionRect.width > 0);
      embedder.test.assertTrue(results.selectionRect.height > 0);

      // Test finding next active matches.
      webview.find("dog");
      webview.find("dog");
      webview.find("dog");
      webview.find("dog");
      webview.find("dog", {}, function(results) {
        embedder.test.assertEq(results.activeMatchOrdinal, 6);
        webview.find("dog", {backward: true});
        webview.find("dog", {backward: true}, function(results) {
          // Test the |backward| find option.
          embedder.test.assertEq(results.activeMatchOrdinal, 4);

          // Test the |matchCase| find option.
          webview.find("Dog", {matchCase: true}, function(results) {
            embedder.test.assertEq(results.numberOfMatches, 40);

            // Test canceling find requests.
            webview.find("dog");
            webview.stopFinding();
            webview.find("dog");
            webview.find("cat");

            // Test find results when looking for something that isn't there.
            webview.find("fish", {}, function(results) {
              embedder.test.assertEq(results.numberOfMatches, 0);
              embedder.test.assertEq(results.activeMatchOrdinal, 0);
              embedder.test.assertEq(results.selectionRect.left, 0);
              embedder.test.assertEq(results.selectionRect.top, 0);
              embedder.test.assertEq(results.selectionRect.width, 0);
              embedder.test.assertEq(results.selectionRect.height, 0);

              // Test following a link with stopFinding().
              webview.removeEventListener('loadstop', loadstopListener1);
              webview.addEventListener('loadstop', loadstopListener2);
              webview.find("click here!", {}, function() {
                webview.stopFinding("activate");
              });
            });
          });
        });
      });
    });
  };

  webview.addEventListener('loadstop', loadstopListener1);
  document.body.appendChild(webview);
};

function testFindAPI_findupdate() {
  var webview = new WebView();
  webview.src = 'data:text/html,Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br>' +
      'Dog dog dog Dog dog dogcatDog dogDogdog.<br><br>' +
      '<a href="about:blank">Click here!</a>';
  var canceledTest = false;
  webview.addEventListener('loadstop', function(e) {
    // Test the |findupdate| event.
    webview.addEventListener('findupdate', function(e) {
      if (e.activeMatchOrdinal > 0) {
        // embedder.test.assertTrue(e.numberOfMatches >= e.activeMatchOrdinal)
        // This currently fails because of http://crbug.com/342445 .
        embedder.test.assertTrue(e.selectionRect.width > 0);
        embedder.test.assertTrue(e.selectionRect.height > 0);
      }

      if (e.finalUpdate) {
        if (e.canceled) {
          canceledTest = true;
        } else {
          embedder.test.assertEq(e.searchText, "dog");
          embedder.test.assertEq(e.numberOfMatches, 100);
          embedder.test.assertEq(e.activeMatchOrdinal, 1);
          embedder.test.assertTrue(canceledTest);
          embedder.test.succeed();
        }
      }
    });
    wv.find("dog");
    wv.find("cat");
    wv.find("dog");
  });

  document.body.appendChild(webview);
};

// This test verifies that getProcessId is defined and returns a non-zero
// value corresponding to the processId of the guest process.
function testGetProcessId() {
  var webview = document.createElement('webview');
  webview.setAttribute('src', 'data:text/html,trigger navigation');
  var firstLoad = function() {
    webview.removeEventListener('loadstop', firstLoad);
    embedder.test.assertTrue(webview.getProcessId() > 0);
    embedder.test.succeed();
  };
  webview.addEventListener('loadstop', firstLoad);
  document.body.appendChild(webview);
}

function testHiddenBeforeNavigation() {
  var webview = document.createElement('webview');
  webview.style.visibility = 'hidden';

  var postMessageHandler = function(e) {
    var data = JSON.parse(e.data);
    window.removeEventListener('message', postMessageHandler);
    if (data[0] == 'visibilityState-response') {
      embedder.test.assertEq('hidden', data[1]);
      embedder.test.succeed();
    } else {
      window.console.warn('Unexpected message: ' + data);
      embedder.test.fail();
    }
  };

  webview.addEventListener('loadstop', function(e) {
    window.console.warn('webview.loadstop');
    window.addEventListener('message', postMessageHandler);
    webview.addEventListener('consolemessage', function(e) {
      window.console.warn('g: ' + e.message);
    });

    webview.executeScript(
      {file: 'inject_hidden_test.js'},
      function(results) {
        if (!results || !results.length) {
          window.console.warn('Failed to inject script: inject_hidden_test.js');
          embedder.test.fail();
          return;
        }

        window.console.warn('script injection success');
        webview.contentWindow.postMessage(
            JSON.stringify(['visibilityState-request']), '*');
      });
  });

  webview.setAttribute('src', 'data:text/html,<html><body></body></html>');
  document.body.appendChild(webview);
}

// Makes sure inline scripts works inside guest that was loaded from
// accessible_resources.
function testInlineScriptFromAccessibleResources() {
  var webview = document.createElement('webview');
  // foobar is a privileged partition according to the manifest file.
  webview.partition = 'foobar';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.fail();
  });
  webview.addEventListener('consolemessage', function(e) {
    window.console.log('consolemessage: ' + e.message);
    if (e.message == 'guest_with_inline_script.html: Inline script ran') {
      embedder.test.succeed();
    }
  });
  webview.setAttribute('src', 'guest_with_inline_script.html');
  document.body.appendChild(webview);
}

// This tests verifies that webview fires a loadabort event instead of crashing
// the browser if we attempt to navigate to a chrome-extension: URL with an
// extension ID that does not exist.
function testInvalidChromeExtensionURL() {
  var invalidResource = 'chrome-extension://abc123/guest.html';
  var webview = document.createElement('webview');
  // foobar is a privileged partition according to the manifest file.
  webview.partition = 'foobar';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.succeed();
  });
  webview.setAttribute('src', invalidResource);
  document.body.appendChild(webview);
}

// This test verifies that the loadabort event fires when loading a webview
// accessible resource from a partition that is not privileged.
function testLoadAbortChromeExtensionURLWrongPartition() {
  var localResource = chrome.runtime.getURL('guest.html');
  var webview = document.createElement('webview');
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ADDRESS_UNREACHABLE', e.reason);
    embedder.test.succeed();
  });
  webview.addEventListener('loadstop', function(e) {
    embedder.test.fail();
  });
  webview.setAttribute('src', localResource);
  document.body.appendChild(webview);
}

// This test verifies that the loadabort event fires as expected when an illegal
// chrome URL is provided.
function testLoadAbortIllegalChromeURL() {
  var webview = document.createElement('webview');
  var onFirstLoadStop = function(e) {
    webview.removeEventListener('loadstop', onFirstLoadStop);
    webview.setAttribute('src', 'chrome://newtab');
  };
  webview.addEventListener('loadstop', onFirstLoadStop);
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ABORTED', e.reason);
    embedder.test.succeed();
  });
  webview.setAttribute('src', 'about:blank');
  document.body.appendChild(webview);
}

function testLoadAbortIllegalFileURL() {
  var webview = document.createElement('webview');
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ABORTED', e.reason);
    embedder.test.succeed();
  });
  webview.setAttribute('src', 'file://foo');
  document.body.appendChild(webview);
}

function testLoadAbortIllegalJavaScriptURL() {
  var webview = document.createElement('webview');
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ABORTED', e.reason);
    embedder.test.succeed();
  });
  webview.setAttribute('src', 'javascript:void(document.bgColor="#0000FF")');
  document.body.appendChild(webview);
}

// Verifies that navigating to invalid URL (e.g. 'http:') doesn't cause a crash.
function testLoadAbortInvalidNavigation() {
  var webview = document.createElement('webview');
  var validSchemeWithEmptyURL = 'http:';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ABORTED', e.reason);
    embedder.test.assertEq('', e.url);
    embedder.test.succeed();
  });
  webview.addEventListener('exit', function(e) {
    // We should not crash.
    embedder.test.fail();
  });
  webview.setAttribute('src', validSchemeWithEmptyURL);
  document.body.appendChild(webview);
}

// Verifies that navigation to a URL that is valid but not web-safe or
// pseudo-scheme fires loadabort and doesn't cause a crash.
function testLoadAbortNonWebSafeScheme() {
  var webview = document.createElement('webview');
  var chromeGuestURL = 'chrome-guest://abc123';
  webview.addEventListener('loadabort', function(e) {
    embedder.test.assertEq('ERR_ABORTED', e.reason);
    embedder.test.assertEq('chrome-guest://abc123/', e.url);
    embedder.test.succeed();
  });
  webview.addEventListener('exit', function(e) {
    // We should not crash.
    embedder.test.fail();
  });
  webview.setAttribute('src', chromeGuestURL);
  document.body.appendChild(webview);
};

// Tests that the 'loadprogress' event is triggered correctly.
function testLoadProgressEvent() {
  var webview = document.createElement('webview');
  var progress = 0;

  webview.addEventListener('loadstop', function(evt) {
    embedder.test.assertEq(1, progress);
    embedder.test.succeed();
  });

  webview.addEventListener('loadprogress', function(evt) {
    progress = evt.progress;
  });

  webview.setAttribute('src', 'data:text/html,trigger navigation');
  document.body.appendChild(webview);
}

function testNavigationToExternalProtocol() {
  var webview = document.createElement('webview');
  webview.addEventListener('loadstop', function(e) {
    webview.addEventListener('loadabort', function(e) {
      embedder.test.assertEq('ERR_UNKNOWN_URL_SCHEME', e.reason);
      embedder.test.succeed();
    });
    webview.executeScript({
      code: 'window.location.href = "tel:+12223334444";'
    }, function(results) {});
  });
  webview.setAttribute('src', 'data:text/html,navigate to external protocol');
  document.body.appendChild(webview);
}

// This test ensures if the guest isn't there and we resize the guest (from JS),
// it remembers the size correctly.
function testNavigateAfterResize() {
  var webview = document.createElement('webview');

  var postMessageHandler = function(e) {
    var data = JSON.parse(e.data);
    webview.removeEventListener('message', postMessageHandler);
    if (data[0] == 'dimension-response') {
      var actualWidth = data[1];
      var actualHeight = data[2];
      embedder.test.assertEq(100, actualWidth);
      embedder.test.assertEq(125, actualHeight);
      embedder.test.succeed();
    }
  };
  window.addEventListener('message', postMessageHandler);

  webview.addEventListener('consolemessage', function(e) {
    window.console.warn('guest log: ' + e.message);
  });

  webview.addEventListener('loadstop', function(e) {
    webview.executeScript(
      {file: 'navigate_after_resize.js'},
      function(results) {
        if (!results || !results.length) {
          window.console.warn('Failed to inject navigate_after_resize.js');
          embedder.test.fail();
          return;
        }
        var msg = ['dimension-request'];
        webview.contentWindow.postMessage(JSON.stringify(msg), '*');
      });
  });

  // First set size.
  webview.style.width = '100px';
  webview.style.height = '125px';

  // Then navigate.
  webview.src = 'about:blank';
  document.body.appendChild(webview);
}

// This test verifies that multiple consecutive changes to the <webview> src
// attribute will cause a navigation.
function testNavOnConsecutiveSrcAttributeChanges() {
  var testPage1 = 'data:text/html,test page 1';
  var testPage2 = 'data:text/html,test page 2';
  var testPage3 = 'data:text/html,test page 3';
  var webview = document.createElement('webview');
  webview.partition = arguments.callee.name;
  var loadCommitCount = 0;
  webview.addEventListener('loadcommit', function(e) {
    if (e.url == testPage3) {
      embedder.test.succeed();
    }
    loadCommitCount++;
    if (loadCommitCount > 3) {
      embedder.test.fail();
    }
  });
  document.body.appendChild(webview);
  webview.src = testPage1;
  webview.src = testPage2;
  webview.src = testPage3;
}

// This test verifies that we can set the <webview> src multiple times and the
// changes will cause a navigation.
function testNavOnSrcAttributeChange() {
  var testPage1 = 'data:text/html,test page 1';
  var testPage2 = 'data:text/html,test page 2';
  var testPage3 = 'data:text/html,test page 3';
  var tests = [testPage1, testPage2, testPage3];
  var webview = document.createElement('webview');
  webview.partition = arguments.callee.name;
  var loadCommitCount = 0;
  webview.addEventListener('loadcommit', function(evt) {
    var success = tests.indexOf(evt.url) > -1;
    embedder.test.assertTrue(success);
    ++loadCommitCount;
    if (loadCommitCount == tests.length) {
      embedder.test.succeed();
    } else if (loadCommitCount > tests.length) {
      embedder.test.fail();
    } else {
      webview.src = tests[loadCommitCount];
    }
  });
  webview.src = tests[0];
  document.body.appendChild(webview);
}

// This test verifies that setting the partition attribute after the src has
// been set raises an exception.
function testPartitionRaisesException() {
  var webview = document.createElement('webview');
  var partitionAttribute = arguments.callee.name;
  webview.setAttribute('partition', partitionAttribute);

  var loadstopHandler = function(e) {
    try {
      webview.partition = 'illegal';
      embedder.test.fail();
    } catch (e) {
      embedder.test.assertEq(partitionAttribute, webview.partition);
      embedder.test.succeed();
    }
  };
  webview.addEventListener('loadstop', loadstopHandler);

  webview.setAttribute('src', 'data:text/html,trigger navigation');
  document.body.appendChild(webview);
}

// This test verifies that removing partition attribute after navigation does
// not work, i.e. the partition remains the same.
function testPartitionRemovalAfterNavigationFails() {
  var webview = document.createElement('webview');

  var partition = 'testme';
  webview.setAttribute('partition', partition);

  var loadstopHandler = function(e) {
    // Removing after navigation should not change the partition.
    webview.removeAttribute('partition');
    embedder.test.assertEq('testme', webview.partition);
    embedder.test.succeed();
  };
  webview.addEventListener('loadstop', loadstopHandler);

  webview.setAttribute('src', 'data:text/html,<html><body>guest</body></html>');
  document.body.appendChild(webview);
}

// This test verifies that <webview> reloads the page if the src attribute is
// assigned the same value.
function testReassignSrcAttribute() {
  var dataUrl = 'data:text/html,test page';
  var webview = document.createElement('webview');
  webview.partition = arguments.callee.name;

  var loadStopCount = 0;
  webview.addEventListener('loadstop', function(evt) {
    embedder.test.assertEq(dataUrl, webview.getAttribute('src'));
    ++loadStopCount;
    console.log('[' + loadStopCount + '] loadstop called');
    if (loadStopCount == 3) {
      embedder.test.succeed();
    } else if (loadStopCount > 3) {
      embedder.test.fail();
    } else {
      webview.src = dataUrl;
    }
  });
  webview.src = dataUrl;
  document.body.appendChild(webview);
}

// This test verifies that the reload method on webview functions as expected.
function testReload() {
  var triggerNavUrl = 'data:text/html,trigger navigation';
  var webview = document.createElement('webview');

  var loadCommitCount = 0;
  webview.addEventListener('loadstop', function(e) {
    if (loadCommitCount < 2) {
      webview.reload();
    } else if (loadCommitCount == 2) {
      embedder.test.succeed();
    } else {
      embedder.test.fail();
    }
  });
  webview.addEventListener('loadcommit', function(e) {
    embedder.test.assertEq(triggerNavUrl, e.url);
    embedder.test.assertTrue(e.isTopLevel);
    loadCommitCount++;
  });

  webview.setAttribute('src', triggerNavUrl);
  document.body.appendChild(webview);
}

// This test verifies that the reload method on webview functions as expected.
function testReloadAfterTerminate() {
  var triggerNavUrl = 'data:text/html,trigger navigation';
  var webview = document.createElement('webview');

  var step = 1;
  webview.addEventListener('loadstop', function(e) {
    switch (step) {
      case 1:
        webview.terminate();
        break;
      case 2:
        setTimeout(function() { embedder.test.succeed(); }, 0);
        break;
      default:
        window.console.log('Unexpected loadstop event, step = ' + step);
        embedder.test.fail();
        break;
    }
    ++step;
  });

  webview.addEventListener('exit', function(e) {
    // Trigger a focus state change of the guest to test for
    // http://crbug.com/413874.
    webview.blur();
    webview.focus();
    setTimeout(function() { webview.reload(); }, 0);
  });

  webview.src = triggerNavUrl;
  document.body.appendChild(webview);
}


// Tests end.

embedder.test.testList = {
  'testAllowTransparencyAttribute': testAllowTransparencyAttribute,
  'testAPIMethodExistence': testAPIMethodExistence,
  'testAssignSrcAfterCrash': testAssignSrcAfterCrash,
  'testAutosizeAfterNavigation': testAutosizeAfterNavigation,
  'testAutosizeBeforeNavigation': testAutosizeBeforeNavigation,
  'testAutosizeHeight': testAutosizeHeight,
  'testAutosizeRemoveAttributes': testAutosizeRemoveAttributes,
  'testAutosizeWithPartialAttributes': testAutosizeWithPartialAttributes,
  'testCannotMutateEventName': testCannotMutateEventName,
  'testContentLoadEvent': testContentLoadEvent,
  'testDestroyOnEventListener': testDestroyOnEventListener,
  'testDisplayNoneWebviewLoad': testDisplayNoneWebviewLoad,
  'testDisplayNoneWebviewRemoveChild': testDisplayNoneWebviewRemoveChild,
  'testExecuteScript': testExecuteScript,
  'testExecuteScriptFail': testExecuteScriptFail,
  'testExecuteScriptIsAbortedWhenWebViewSourceIsChanged':
      testExecuteScriptIsAbortedWhenWebViewSourceIsChanged,
  'testFindAPI': testFindAPI,
  'testFindAPI_findupdate': testFindAPI,
  'testGetProcessId': testGetProcessId,
  'testHiddenBeforeNavigation': testHiddenBeforeNavigation,
  'testInlineScriptFromAccessibleResources':
      testInlineScriptFromAccessibleResources,
  'testInvalidChromeExtensionURL': testInvalidChromeExtensionURL,
  'testLoadAbortChromeExtensionURLWrongPartition':
      testLoadAbortChromeExtensionURLWrongPartition,
  'testLoadAbortIllegalChromeURL': testLoadAbortIllegalChromeURL,
  'testLoadAbortIllegalFileURL': testLoadAbortIllegalFileURL,
  'testLoadAbortIllegalJavaScriptURL': testLoadAbortIllegalJavaScriptURL,
  'testLoadAbortInvalidNavigation': testLoadAbortInvalidNavigation,
  'testLoadAbortNonWebSafeScheme': testLoadAbortNonWebSafeScheme,
  'testLoadProgressEvent': testLoadProgressEvent,
  'testNavigateAfterResize': testNavigateAfterResize,
  'testNavigationToExternalProtocol': testNavigationToExternalProtocol,
  'testNavOnConsecutiveSrcAttributeChanges':
      testNavOnConsecutiveSrcAttributeChanges,
  'testNavOnSrcAttributeChange': testNavOnSrcAttributeChange,
  'testPartitionRaisesException': testPartitionRaisesException,
  'testPartitionRemovalAfterNavigationFails':
      testPartitionRemovalAfterNavigationFails,
  'testReassignSrcAttribute': testReassignSrcAttribute,
  'testReload': testReload,
  'testReloadAfterTerminate': testReloadAfterTerminate
};

onload = function() {
  chrome.test.sendMessage('LAUNCHED');
};
