    /*global chrome*/
import ExtPay from 'extpay';
import { Configuration, OpenAIApi } from "openai";
import styles from "./App.module.css";
import { useEffect, useState } from "react";
import HelpIcon from '@mui/icons-material/Help';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TollIcon from '@mui/icons-material/Toll';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { initializeApp } from "firebase/app";
import { getDatabase, update, ref, onValue  } from "firebase/database";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// openai api init
const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI,
});
const openai = new OpenAIApi(configuration);

// initialize the database that we call to read/write the credits for the user
// const firebaseConfig = {
//     databaseURL: process.env.REACT_APP_DATABASE,
// };
// var app = initializeApp(firebaseConfig);
// var database = getDatabase(app);

// localStorage.setItem('credits', 'loading...');



// extpay init
const extpay = ExtPay('quickfireai');

// extpay.onPaid.addListener(user => {
//   // to add security, put a read of current value and don't add more credits if it's greater than 10 b/c this means it's a repeat
//   user = user.email.split("@")[0];
//   // check when the user began paying, and compare that to the current date
//   var today = new Date();
//   var diff = today - user.paidAt;
//   console.log(user.paidAt);
//   console.log(today);
//   console.log(diff);
//   const updates = {};
//   updates[user] = 550;
//   update(ref(database), updates);
// })

// extpay.onTrialStarted.addListener(user => {
//   user = user.email.split("@")[0];
//   const updates = {};
//   updates[user] = 10;
//   update(ref(database), updates);
// })

export default function App() {
  const [input, setInput] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [allPrompts, setAllPrompts] = useState([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [infoPage, setInfoPage] = useState(false);
  const [settingsPage, setSettingsPage] = useState(false);
  const [credits, setCredits] = useState('loading...');
  const [user, setUser] = useState('loading...');
  const [loading, setLoading] = useState(false);
  const [retryFlag, setRetryFlag] = useState(false);
  const [genInit, setGenInit] = useState(false);

  useEffect(() => {
    extpay.getUser().then(user => {
      if (user) {
        user = user.email.split("@")[0];
        setUser(user);
      }
      // onValue(ref(database, user), (snapshot) => {
      //   const data = snapshot.val();
      //   setCredits(data);
      // });
    });
  });

  async function getGeneration() {
        setAllPrompts([...allPrompts, input]);

        if (genInit) {
          const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: "Create a friendly and professional email based off this information and intent: " + input.substring(0, 500),
            temperature: 0.7,
            max_tokens: 500,
            n: 1,
          });

          if (retryFlag) {
            setAllResults([...allResults, response.data.choices[0].text]);
          } else {
            setAllResults([response.data.choices[0].text]);
          }
  
          setIsGenerated(true);
          setLoading(false);

          return;
        }

        const response = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: "Create a friendly and professional response to the following message: " + input.substring(0, 600),
          temperature: 0.7,
          max_tokens: 400,
          n: 1,
        });

        if (retryFlag) {
          setAllResults([...allResults, response.data.choices[0].text]);
        } else {
          setAllResults([response.data.choices[0].text]);
        }

        setIsGenerated(true);
        setLoading(false);
  }
  
  function copyResponse(response) {
    navigator.clipboard.writeText(response);
  }

  async function checkCredits(user) {
    user = user.email.split("@")[0];

    // get the credits value from the user's entry in the firebase realtime database 
    // onValue(ref(database, user), (snapshot) => {
    //   const data = snapshot.val();
    //   setCredits(data);
    // });

    // if (credits === 'loading...') {
    //   return;
    // }

    // if the user has more than 0 credits, call getGeneration() and decrement their amount of credits in the database by 1
    if (credits > 0) {
      // enough credits
      setLoading(true);
      const updates = {};
      updates[user] = credits - 1;
      // update(ref(database), updates);
      getGeneration();
    } else {
      // not enough credits
      // if subscribed, give option to buy more credits
      if (user.paid) {
        // show popup to buy more credits
        alert('buy more credits');
      }
      // if trial, give option to subscribe
      else {
        // show popup to subscribe
        extpay.openPaymentPage();
      }
    }
  }

  function retry() {
    setLoading(true);
    getGeneration();
  }

  async function onSubmit(event) {
    event.preventDefault();

    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //   chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
    //     console.log(response.farewell);
    //   });
    // });

    setLoading(true);

    extpay.getUser().then(user => {

      if (user.paid) {        
        //checkCredits(user);
        getGeneration();
      } else if (user.trialStartedAt) {
        const now = new Date();
        const sevenDays = 1000*60*60*24*7 // in milliseconds
        if (user.trialStartedAt && (now - user.trialStartedAt) < sevenDays) {
          getGeneration();
        } else {
          setLoading(false);
          alert('Trial expired! Please subscribe to continue using QuickFire AI.');
          extpay.openPaymentPage();
        }
      } else {
        setLoading(false);
        extpay.openTrialPage('one week');
      }
    })
  }

  // start page render
  if (!isGenerated && !infoPage && !settingsPage && !genInit) {
    return (

      <div>
        <div className={styles.headerOver}>
        <div className={styles.headerBack}>
        </div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>
        </div>

          <div className={styles.card}> 
            <h2 >
              Enter a message to respond to:
            </h2>
  
            <form  onSubmit={onSubmit}>

                <div className={styles.centered}>
                  <textarea className={styles.input}
                    type="text"
                    name="animal"
                    placeholder=""
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              <div className={styles.loadingThing}>
              {loading ? <p className={styles.element} ><div className={styles.hourglassCentered}><HourglassTopIcon /></div></p> : <input className={styles.button} type="submit" value="Generate Response" />}
              </div>
            </form>
            <br/>
            <div className={styles.switcherWrapper}>
            <text className={styles.switcher} onClick={() => setGenInit(true)}>Or, generate a message from a prompt<ArrowForwardIcon className={styles.changeIcon}/></text>
            </div>
          </div>

      </div>
    );
  } else if (genInit && !isGenerated && !infoPage && !settingsPage) {
    return (

      <div>
        <div className={styles.headerOver}>
        <div className={styles.headerBack}>
        </div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>
        </div>

          <div className={styles.card}> 
            <h2 >
              Enter what you want to say:
            </h2>
  
            <form  onSubmit={onSubmit}>

                <div className={styles.centered}>
                  <textarea className={styles.input}
                    type="text"
                    name="animal"
                    placeholder=""
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </div>
              <div className={styles.loadingThing}>
              {loading ? <p className={styles.element} ><div className={styles.hourglassCentered}><HourglassTopIcon /></div></p> : <input className={styles.button} type="submit" value="Generate Message" />}
              </div>
            </form>
            <br/>
            <div className={styles.switcherWrapper}>
            <text className={styles.switcher} onClick={() => setGenInit(false)}>Or, generate a response from a message<ArrowForwardIcon className={styles.changeIcon}/></text>
            </div>
          </div>

      </div>
    );
    } else if (infoPage && !isGenerated) {
    return (
      <div>
        <div className={styles.headerOver}>
        <div className={styles.headerBack}>
          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />
        </div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => (setSettingsPage(true), setInfoPage(false), setIsGenerated(false))} />
        </div>
        </div>

        <div className={styles.card}> 
          <h2 className={styles.infoTextHead}>Purpose</h2>
          <h2 className={styles.infoText}>
            This is a tool to help you communicate more effectively on email, text, social media, really any written medium. It does this by using the most capable AI language model currently available (which is continually updated as better ones are released) to give you professional messages specific to your intent that you can build off of or use outright.
          </h2>
          {/* <h2 className={styles.infoTextHead}>Subscription</h2>
          <h2 className={styles.infoText}>
            You get 10 credits for free when signing up. If you find the tool useful, you can purchase a subscription for $10/month, which gives you 550 credits a month. 
          </h2>
          <h2 className={styles.infoTextHead}>Credits</h2>
          <h2 className={styles.infoText}>
            Each generation (which gives you 3 responses) costs a credit. With a subscription, you get 550 credits a month. These don't expire, so if you have credits left at the end of the month, you'll have those + 550 at the start of the new month. <br/> <br/> If you use all your credits before the month is finished and you need more, you can buy 225 more for $5. This is a one-off purchase that can be done as many times as you need, and these credits never expire either.
          </h2> */}
          <h2 className={styles.infoTextHead}>Usage</h2>
          <h2 className={styles.infoText}>
            Quickfire has two modes. You can generate responses to messages by entering the message you received. This will give you a response, which you can copy to your clipboard by clicking.
            <br/>
            <br/>
            You can also generate messages from a prompt. This is useful if you want to write a message with specific intent and details, but aren't sure how best to word it. You can enter what you want to say, and the AI will make it sound professional and polished.
          </h2>
          <h2 className={styles.infoTextHead}>Subscription</h2>
          <h2 className={styles.infoText}>
            Running AI models is cost-intensive, as we need to pay for time on powerful servers. To pay these bills, we run a subscription at $10/month that gives you full access to the tool (for one person; please get in contact if your use-case is enterprise). There is a one-week free trial available as you evaluate the tool. 
          </h2>
          <h2 className={styles.infoTextHead}>Privacy</h2>
          <h2 className={styles.infoText}>
            The only data we collect is your email address (which is never shared) and the number of generations you create per month which we use to prevent system abuse. The content is sent right to the large language model API provided by OpenAI, and then deleted. Your payment data is handled by Stripe, a company that specializes in secure payment processing. If you have further privacy concerns, please get in touch.
          </h2>
          <h2 className={styles.infoTextHead}>Support</h2>
          <h2 className={styles.infoText}>If you need help, have questions, or have a suggestion for an update, you can contact the developer at support@quickfireai.com <br/> <br/> Thank you for using QuickfireAI!</h2>
          <br/>
          <text>v0.0.0.4</text>
        </div>
        </div>
    );
  } else if (settingsPage && !isGenerated) {
    return ( 
      <div>
        <div className={styles.headerOver}>
        <div className={styles.headerBack}>
          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />
        </div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.infoTextUser}>{user}</h2>
          <br/>
          {/* <h2 className={styles.infoTextHead}><div className={styles.sameLevel}>Credits: {credits} </div></h2> */}
          <button className={styles.buttonSettings} onClick={() => alert("Please email support@quickfireai.com and I'll get back to you asap!")}><div className={styles.sameLevel}>Contact Support <MailOutlineIcon className={styles.icons}/></div></button>
          {/* <button className={styles.buttonSettings} onClick={() => window.open('https://buy.stripe.com/aEU3dObBF7Ja31C4gg')}><div className={styles.sameLevel}>Get more credits <TollIcon className={styles.icons}/></div></button> */}
          <button className={styles.buttonSettings} onClick={() => extpay.openPaymentPage()}><div className={styles.sameLevel}>Subscription Settings <SettingsIcon className={styles.icons}/></div></button>
          <br/>
          <br/>
          <text>v0.0.0.4</text>
        </div>
      </div>
    )
  } else {
    return (
      <div>

        <div className={styles.headerOver}>
        <div className={styles.headerBack}>
          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />
        </div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>
        </div>

        <div className={styles.card}> 

            {allResults.map((result, index) => (
              <div className={styles.card} key={index}>
                <p className={styles.responses} onClick={() => {copyResponse(result)}}>{result}</p>
              </div>
            ))}
                      <div className={styles.textThing}>
                        <br/>
          <text >(Click on a response to copy it)</text>
          </div>
          <div className={styles.nothing}>
          {loading ? <div className={styles.hourglass}><HourglassTopIcon /></div> : <button className={styles.buttonSettings} onClick={() => (setRetryFlag(true), retry())}>Retry</button>}
          </div>
          <button className={styles.buttonSettings} onClick={() => (setRetryFlag(false), setSettingsPage(false), setInfoPage(false), setIsGenerated(false), setInput(""))}>New</button>

        </div>
      </div>
    );
  }
}
