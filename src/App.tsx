import Loader, { useLoader } from "global-components/loader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster, toast } from "sonner";
import "./i18n";

import Images from "components/images";
import Settings from "components/settings";
import SideOptions from "components/side-options";
import SignIn from "components/sign-in";
import TagsSelector from "components/tags-selector";
import Uploader from "components/uploader";
import MainView from "components/viewer";
import RoutePaths from "route-paths/index";
import Google from "services/google";
import Imgstor, { ImgstorProvider } from "services/imgstor";

function App() {
  const loader = useLoader();
  const { t } = useTranslation();
  const [imgstor, SetImgstor] = useState<Imgstor>();

  const HandleSignIn = async () => {
    const loading = loader.append();

    try {
      const google = await Google.signIn();
      SetImgstor(await Imgstor.New(google));
    } catch (err) {
      toast.error(t("google.signin.fail"));
      console.error(err);
    }

    loading.remove();
  };

  return (
    <>
      {imgstor ? (
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
              <Route path={`${RoutePaths.SETTINGS}/*`} element={<Settings />} />
              <Route index element={null} />
            </Routes>
          </HashRouter>

          <TagsSelector />
        </ImgstorProvider>
      ) : (
        <SignIn onSignIn={HandleSignIn} />
      )}

      <Loader.Component />
      <Toaster />
    </>
  );
}

export default App;
