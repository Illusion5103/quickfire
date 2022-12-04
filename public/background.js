// background.js
import ExtPay from '../node_modules/extpay';
// import { initializeApp } from "../node_modules/firebase/app";
// import { getDatabase, update, ref, onValue  } from "../node_modules/firebase/database"

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(function(err) {
        // Registration failed
        console.log('ServiceWorker registration failed: ', err);
      });
}
  

var extpay = ExtPay('quickfireai'); 
extpay.startBackground(); 

// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//       console.log(sender.tab ?
//                   "from a content script:" + sender.tab.url :
//                   "from the extension");
//       if (request.greeting === "hello")
//         sendResponse({farewell: "background"});
//     }
//   );

