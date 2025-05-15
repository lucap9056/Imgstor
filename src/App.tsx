import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import "./i18n";

import { Message } from "structs/message";

import Notifications, { useNotifications } from 'components/notifications';
import LoadingState, { useLoadingState } from 'components/loading';
import Alerts, { useAlerts } from 'components/alerts';
import TagsSelecter from 'components/tags-selecter';
import Settings from 'components/settings';
import MainView from "components/viewer";
import SignIn from "components/sign-in";
import Main from "components/main";

import Google, { NotSignedInError } from 'services/google';
import Imgstor, { ImgstorProvider } from 'services/imgstor';
import RoutePaths from "route-paths/index";
import Uploader from 'components/uploader';


function App() {
  const notifications = useNotifications();
  const loadingState = useLoadingState();
  const alerts = useAlerts();

  const { t } = useTranslation();
  const [imgstor, SetImgstor] = useState<Imgstor>();
  const [loaded, setLoaded] = useState(false);
  const [authInstance, SetAuthInstance] = useState<gapi.auth2.GoogleAuth>();

  useEffect(() => {

    const loading = loadingState.Append();

    const loadingAlert = new Message({
      type: Message.Type.ALERT,
      content: t('google.loading')
    });

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
            new Message({
              type: Message.Type.ERROR,
              content: (err as Error).message
            })
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
        new Message({
          type: Message.Type.ERROR,
          content: t("google.signin.fail")
        })
      );
      console.error(err);
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
            <ImgstorProvider value={imgstor}>
              <HashRouter>

                <Main key="main" />
                <Routes>
                  <Route path={RoutePaths.UPLOAD} element={<Uploader />} />
                  <Route path={RoutePaths.FOCUS_VIEW + "/:imageId"} element={<MainView />} />
                  <Route path={RoutePaths.SETTINGS + "/*"} element={<Settings />} />
                  <Route index element={<></>} />
                </Routes>
              </HashRouter>

              <TagsSelecter />
            </ImgstorProvider> :
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
