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

// openai api init
const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI,
});
const openai = new OpenAIApi(configuration);

// initialize the database that we call to read/write the credits for the user
const firebaseConfig = {
    databaseURL: process.env.REACT_APP_DATABASE,
};
var app = initializeApp(firebaseConfig);
var database = getDatabase(app);

localStorage.setItem('credits', 'loading...');

// extpay init
const extpay = ExtPay('quickfireai');

extpay.onPaid.addListener(user => {
  // to add security, put a read of current value and don't add more credits if it's greater than 10 b/c this means it's a repeat
  user = user.email.split("@")[0];
  // check when the user began paying, and compare that to the current date
  var today = new Date();
  var diff = today - user.paidAt;
  console.log(user.paidAt);
  console.log(today);
  console.log(diff);
  const updates = {};
  updates[user] = 550;
  update(ref(database), updates);
})

extpay.onTrialStarted.addListener(user => {
  user = user.email.split("@")[0];
  const updates = {};
  updates[user] = 10;
  update(ref(database), updates);
})

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

  useEffect(() => {
    extpay.getUser().then(user => {
      user = user.email.split("@")[0];
      setUser(user);
      onValue(ref(database, user), (snapshot) => {
        const data = snapshot.val();
        setCredits(data);
      });
    });
  });

  async function getGeneration() {
        setAllPrompts([...allPrompts, input]);
        const response = await openai.createCompletion({
          model: "text-davinci-002",
          prompt: "Provide a really good response to the following message: " + input,
          temperature: 1.0,
          max_tokens: 200,
          n: 3,
        });
        
        setAllResults([...allResults, response.data.choices[0].text, response.data.choices[1].text, response.data.choices[2].text]);
        setInput("");
        setIsGenerated(true);
        setLoading(false);
  }
  
  function copyResponse(response) {
    navigator.clipboard.writeText(response);
  }

  async function checkCredits(user) {
    user = user.email.split("@")[0];

    if (credits === 'loading...') {
      return;
    }

    // get the credits value from the user's entry in the firebase realtime database 
    onValue(ref(database, user), (snapshot) => {
      const data = snapshot.val();
      setCredits(data);
    });

    // if the user has more than 0 credits, call getGeneration() and decrement their amount of credits in the database by 1
    if (credits > 0) {
      // enough credits
      setLoading(true);
      const updates = {};
      updates[user] = credits - 1;
      update(ref(database), updates);
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

  async function onSubmit(event) {
    event.preventDefault();

    extpay.getUser().then(user => {
      if (user.paid || user.trialStartedAt) {        
        checkCredits(user);
      } else {
        extpay.openTrialPage('10 credit');
      }
    })
  }

  // start page render
  if (!isGenerated && !infoPage && !settingsPage) {
    return (

      <div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => setInfoPage(true)} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>

          <div className={styles.card}> 
            <h2 >
              Enter a message:
               
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
              {loading ? <p className={styles.element} ><div className={styles.hourglassCentered}><HourglassTopIcon /></div></p> : <input className={styles.button} type="submit" value="Generate Responses" />}
              </div>
            </form>

          </div>

      </div>
    );
  } else if (infoPage && !isGenerated) {
    return (
      <div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => setInfoPage(true)} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => (setSettingsPage(true), setInfoPage(false))} />
        </div>

        <div className={styles.card}> 

          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />

          <h2 className={styles.infoTextHead}>Purpose</h2>
          <h2 className={styles.infoText}>
            This is a tool to help you generate responses to messages you receive on email, text, social media, and anywhere else. It does this by using the most capable AI language model currently available (GPT-3 Davinci-002) to give you a few starting responses that you can build off of or use outright.
          </h2>
          <h2 className={styles.infoTextHead}>Subscription</h2>
          <h2 className={styles.infoText}>
            You get 10 credits for free when signing up. If you find the tool useful, you can purchase a subscription for $10/month, which gives you 550 credits a month. 
          </h2>
          <h2 className={styles.infoTextHead}>Credits</h2>
          <h2 className={styles.infoText}>
            Each generation (which gives you 3 responses) costs a credit. With a subscription, you get 550 credits a month. These don't expire, so if you have credits left at the end of the month, you'll have those + 550 at the start of the new month. <br/> <br/> If you use all your credits before the month is finished and you need more, you can buy 225 more for $5. This is a one-off purchase that can be done as many times as you need, and these credits never expire either.
          </h2>
          <h2 className={styles.infoTextHead}>Privacy</h2>
          <h2 className={styles.infoText}>
            The only data we collect is your email address (which is never shared) and the number of generations you create per month (not the content). Your payment data is handled by Stripe, a company that specializes in secure payment processing. The content of your generations is not saved - it is sent to the OpenAI API to get a response and then discarded (they don't save it because that would cost more money). If you have further privacy concerns, please get in touch.
          </h2>
          <h2 className={styles.infoTextHead}>Support</h2>
          <h2 className={styles.infoText}>If you need help, have questions, or have a suggestion for an update, you can contact the developer at support@quickfireai.com <br/> <br/> Thank you for using QuickfireAI!</h2>
        </div>
        </div>
    );
  } else if (settingsPage && !isGenerated) {
    return ( 
      <div>
        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => setSettingsPage(true)} />
        </div>

        <div className={styles.card}>
          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />
          <h2 className={styles.infoTextUser}>{user}</h2>
          <h2 className={styles.infoTextHead}><div className={styles.sameLevel}>Credits: {credits} </div></h2>
          <button className={styles.buttonSettings} onClick={() => alert("Please email support@quickfireai.com and I'll get back to you asap!")}><div className={styles.sameLevel}>Contact developer <MailOutlineIcon className={styles.icons}/></div></button>
          <button className={styles.buttonSettings} onClick={() => window.open('https://buy.stripe.com/aEU3dObBF7Ja31C4gg')}><div className={styles.sameLevel}>Get more credits <TollIcon className={styles.icons}/></div></button>
          <button className={styles.buttonSettings} onClick={() => extpay.openPaymentPage()}><div className={styles.sameLevel}>Subscription settings <SettingsIcon className={styles.icons}/></div></button>
        </div>
      </div>
    )
  } else {
    return (
      <div>

        <div className={styles.header}>
          <HelpIcon className={styles.infoButton} onClick={() => (setInfoPage(true), setIsGenerated(false), setSettingsPage(false))} />
          <AccountCircleIcon className={styles.infoButton} onClick={() => (setSettingsPage(true), setIsGenerated(false), setInfoPage(false))} />
        </div>

        <div className={styles.card}> 

          <ArrowBackIcon className={styles.backButton} onClick={() => (setSettingsPage(false), setInfoPage(false), setIsGenerated(false))} />
          
          <div className={styles.textThing}>
          <h2 >Click on a response to copy it to your clipboard:</h2>
          </div>

            {allResults.map((result, index) => (
              <div className={styles.card} key={index}>
                <p className={styles.responses} onClick={() => {copyResponse(result)}}>{result}</p>
              </div>
            ))}

        </div>
      </div>
    );
  }
}
