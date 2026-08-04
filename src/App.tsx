import Alerts, { useAlerts } from "global-components/alerts";
import Loader, { useLoader } from "global-components/loader";
import Notifications, {
  useNotifications,
} from "global-components/notifications";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HashRouter, Route, Routes } from "react-router-dom";
import { buildResult, match } from "resultant.js/rustify";
import "./i18n";

import Images from "components/images";
import Settings from "components/settings";
import SideOptions from "components/side-options";
import SignIn from "components/sign-in";
import TagsSelector from "components/tags-selector";
import Uploader from "components/uploader";
import MainView from "components/viewer";
import RoutePaths from "route-paths/index";
import Google, { NotSignedInError } from "services/google";
import Imgstor, { ImgstorProvider } from "services/imgstor";
import { Message } from "structs/message";

function App() {
  const notifications = useNotifications();
  const loader = useLoader();
  const alerts = useAlerts();

  const { t } = useTranslation();
  const [imgstor, SetImgstor] = useState<Imgstor>();
  const [loaded, setLoaded] = useState(false);
  const [authInstance, SetAuthInstance] = useState<gapi.auth2.GoogleAuth>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount to initialize Google/Imgstor; re-running on t/loader/notifications/alerts changes (e.g. language switch) would needlessly restart sign-in
  useEffect(() => {
    const loading = loader.append();

    const loadingMessage = notifications.append(
      new Message({
        type: Message.Type.ALERT,
        content: t("google.loading"),
      }),
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
          } else {
            alerts.append(
              new Message({
                type: Message.Type.ERROR,
                content: (err as Error).message,
              }),
            );
          }
        },
      });

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
            content: t("google.signin.fail"),
          }),
        );
        console.error(err);
      },
    });

    setLoaded(true);
    loading.remove();
  };

  return (
    <>
      {loaded ? (
        imgstor ? (
          <ImgstorProvider value={imgstor}>
            <HashRouter>
              <Images />
              <SideOptions />
              <Routes>
                <Route path={RoutePaths.UPLOAD} element={<Uploader />} />
                <Route
                  path={`${RoutePaths.FOCUS_VIEW}/:imageId`}
                  element={<MainView />}
                />
                <Route
                  path={`${RoutePaths.SETTINGS}/*`}
                  element={<Settings />}
                />
                <Route index element={null} />
              </Routes>
            </HashRouter>

            <TagsSelector />
          </ImgstorProvider>
        ) : (
          <SignIn onSignIn={HandleSignIn} />
        )
      ) : null}

      <Alerts />
      <Loader.Component />
      <Notifications />
    </>
  );
}

export default App;
