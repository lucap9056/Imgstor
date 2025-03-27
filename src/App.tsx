import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import "./i18n";

import MessageManager, { Message } from "utils/message";

import Notifications from 'components/notifications';
import LoadingState from 'components/loading';
import Alerts from 'components/alerts';
import TagsSelecter from 'components/tags-selecter';
import Settings from 'components/settings';
import MainView from "components/viewer";
import SignIn from "components/sign-in";
import Main from "components/main";

import Google, { NotSignedInError } from 'services/google';
import Imgstor from 'services/imgstor';
import RoutePaths from "route-paths/index";
import Uploader from 'components/uploader';


function App() {
  const [notifications] = useState(new MessageManager());
  const [loadingState] = useState<LoadingState>(new LoadingState());
  const [alerts] = useState(new MessageManager());

  const { t } = useTranslation();
  const [imgstor, SetImgstor] = useState<Imgstor>();
  const [loaded, setLoaded] = useState(false);
  const [authInstance, SetAuthInstance] = useState<gapi.auth2.GoogleAuth>();




  useEffect(() => {

    const loading = loadingState.Append();

    const loadingAlert = new Message(Message.Type.ALERT, t('app_google_api_loading'));

    notifications.Append(loadingAlert);

    (async () => {

      try {

        const google = await Google.New();

        const _imgstor = await Imgstor.New(google);
        SetImgstor(_imgstor);

      } catch (err) {

        if (err instanceof NotSignedInError) {
          SetImgstor(undefined);
          SetAuthInstance(err.authInstance);
        } else {
          alerts.Append(
            new Message(Message.Type.ERROR, (err as Error).message)
          );
        }

      } finally {

        setLoaded(true);
        loading.Remove();
        loadingAlert.Remove();

      }

    })();


  }, []);


  const HandleSignIn = async () => {
    if (!authInstance) {
      return;
    }

    setLoaded(false);

    const loading = loadingState.Append();

    try {
      const google = await Google.SignIn(authInstance);
      const _imgstor = await Imgstor.New(google);
      SetImgstor(_imgstor);
    } catch (err) {
      notifications.Append(
        new Message(Message.Type.ERROR, t("signin_fail"))
      );
    } finally {
      setLoaded(true);
      loading.Remove();
    }

  }

  return <>
    {
      loaded ? <>
        {
          imgstor ?
            <>
              <HashRouter>

                <Main key="main" imgstor={imgstor} />
                <Routes>
                  <Route path={RoutePaths.UPLOAD} element={<Uploader imgstor={imgstor} />} />
                  <Route path={RoutePaths.FOCUS_VIEW + "/:image_id"} element={<MainView imgstor={imgstor} />} />
                  <Route path={RoutePaths.SETTINGS + "/*"} element={<Settings imgstor={imgstor} />} />
                  <Route index element={<></>} />
                </Routes>
              </HashRouter>

              <TagsSelecter imgstor={imgstor} />
            </> :
            <SignIn key="signin" onSignIn={HandleSignIn} />

        }
      </> :
        <></>
    }

    <Alerts manager={alerts} />
    <LoadingState.Component manager={loadingState} />
    <Notifications manager={notifications} />
  </>;
}

export default App;
