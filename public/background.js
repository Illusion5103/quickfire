// background.js
import ExtPay from 'extpay';


var extpay = ExtPay('quickfireai'); 
extpay.startBackground(); 

localStorage.setItem('extpay', 'quickfireai');
chrome.storage.sync.set({key: value}, function() {
    console.log('Value is set to ' + value);
})