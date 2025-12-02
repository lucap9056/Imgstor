import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildResult, match } from 'resultant.js/rustify';

import Notifications, { useNotifications } from 'global-components/notifications';
import Loader, { useLoader } from 'global-components/loader';
import Alerts, { useAlerts } from 'global-components/alerts';
import "./i18n";

import { Message } from "structs/message";

import TagsSelector from 'components/tags-selector';
import Settings from 'components/settings';
import MainView from "components/viewer";
import SignIn from "components/sign-in";
import SideOptions from 'components/side-options';
import Uploader from 'components/uploader';

import Google, { NotSignedInError } from 'services/google';
import Imgstor, { ImgstorProvider } from 'services/imgstor';
import RoutePaths from "route-paths/index";
import Images from 'components/images';


function App() {
  const notifications = useNotifications();
  const loader = useLoader();
  const alerts = useAlerts();

  const { t } = useTranslation();
  const [imgstor, SetImgstor] = useState<Imgstor>();
  const [loaded, setLoaded] = useState(false);
  const [authInstance, SetAuthInstance] = useState<gapi.auth2.GoogleAuth>();

  useEffect(() => {

    const loading = loader.append();

    const loadingMessage = notifications.append(
      new Message({
        type: Message.Type.ALERT,
        content: t('google.loading')
      })
    );

    buildResult(async () => {
      const google = await Google.new();
      return Imgstor.New(google);
    }).then((result) => {

      match(result, {
        Ok(value) {
          SetImgstor(value);
        },
        Err(err) {
          console.log(err);
          if (err instanceof NotSignedInError) {
            SetImgstor(undefined);
            SetAuthInstance(err.authInstance);
          }
          else {

            alerts.append(
              new Message({
                type: Message.Type.ERROR,
                content: (err as Error).message
              })
            );

          }

        }
      })

      setLoaded(true);
      loading.remove();
      loadingMessage.remove();

    });

  }, []);


  const HandleSignIn = async () => {
    console.log(authInstance);
    if (!authInstance) {
      return;
    }

    setLoaded(false);

    const loading = loader.append();

    const result = await buildResult(async () => {
      const google = await Google.signIn(authInstance);
      return Imgstor.New(google);
    });

    match(result, {
      Ok(value) {
        SetImgstor(value);
      },
      Err(err) {
        notifications.append(
          new Message({
            type: Message.Type.ERROR,
            content: t("google.signin.fail")
          })
        );
        console.error(err);
      }
    });

    setLoaded(true);
    loading.remove();

  }

  return <>
    {
      loaded ?
        imgstor ?
          <ImgstorProvider value={imgstor}>
            <HashRouter>
              <Images />
              <SideOptions />
              <Routes>
                <Route path={RoutePaths.UPLOAD} element={<Uploader />} />
                <Route path={RoutePaths.FOCUS_VIEW + "/:imageId"} element={<MainView />} />
                <Route path={RoutePaths.SETTINGS + "/*"} element={<Settings />} />
                <Route index element={<></>} />
              </Routes>
            </HashRouter>

            <TagsSelector />
          </ImgstorProvider> :
          <SignIn onSignIn={HandleSignIn} />
        : <></>
    }

    <Alerts />
    <Loader.Component />
    <Notifications />
  </>;
}

export default App;
