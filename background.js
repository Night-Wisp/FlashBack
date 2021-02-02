chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("onMessage called", message);
  switch(message.id) {
    default:
      return false;
      break;
  }
});