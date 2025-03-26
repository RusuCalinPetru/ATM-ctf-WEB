import { Outlet, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppContext from "../Data/AppContext";

function Config(props) {
  const globalData = useContext(AppContext);
  const [assets, setAssets] = useState([]);

  const getTheme = () => {
    axios
      .get(process.env.REACT_APP_BACKEND_URI + "/api/getTheme", {
        withCredentials: true,
      })
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else {
          globalData.setTheme(response.data.theme);

          const root = document.documentElement;

          root.style.setProperty(
            "--color-1",
            response.data.theme.color_1
              ? response.data.theme.color_1
              : "#ff3c5c"
          );
          root.style.setProperty(
            "--color-2",
            response.data.theme.color_2
              ? response.data.theme.color_2
              : "#ff707f"
          );
          root.style.setProperty(
            "--color-1-50",
            response.data.theme.color_1
              ? response.data.theme.color_1 + "50"
              : "#ff707f50"
          );
          root.style.setProperty(
            "--bg-img",
            response.data.theme.bg_img
              ? `url(${response.data.theme.bg_img})`
              : "none"
          );
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  const getAssets = () => {
    axios
      .get(process.env.REACT_APP_BACKEND_URI + "/api/admin/getAssets", {
        withCredentials: true,
      })
      .then((response) => {
        setAssets(response.data);
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  useEffect(() => {
    getTheme();
    getAssets();
  }, []);

  const saveTheme = () => {
    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/saveTheme",
        {
          color_1: document.getElementById("theme_color_1").value,
          color_2: document.getElementById("theme_color_2").value,
          bg_img: document.getElementById("theme_img").textContent,
          top1_icon: document.getElementById("theme_top1").textContent,
          top2_icon: document.getElementById("theme_top2").textContent,
          top3_icon: document.getElementById("theme_top3").textContent,
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else {
          if (response.data.state == "success") {
            globalData.alert.success("Tema actualizata!");
            getTheme();
          } else {
            globalData.alert.error(response.data.message);
            getTheme();
          }
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  const uploadAsset = (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("file", event.target.files[0]);

    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/uploadAsset",
        formData,
        {
          withCredentials: true,
        }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
        } else {
          if (response.data.state == "success") {
            globalData.alert.success("Fisier incarcat!");
            getAssets();
          } else {
            globalData.alert.error(response.data.message);
          }
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  const applyAsset = (fieldId, assetName) => {
    document.getElementById(fieldId).textContent = 
      process.env.REACT_APP_BACKEND_URI + "/api/assets/" + assetName;
  };

  return (
    <div>
      <h1
        className="display-1 bold color_white cool"
        style={{ textAlign: "center", marginBottom: "50px" }}
      >
        TEMA
      </h1>

      <div className="mb-4">
        <h3 className="color_white">Imagini disponibile:</h3>
        <div className="d-flex flex-wrap">
          {assets.map((asset) => (
            <div key={asset.name} className="m-2 text-center">
              <img 
                src={process.env.REACT_APP_BACKEND_URI + "/api/assets/" + asset.name} 
                style={{ height: "50px", maxWidth: "100px" }} 
                alt={asset.name}
              />
              <div className="mt-2">
                <div className="btn-group">
                  <button 
                    className="btn btn-sm btn-outline-info"
                    onClick={() => applyAsset("theme_img", asset.name)}
                  >
                    Background
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-success"
                    onClick={() => applyAsset("theme_top1", asset.name)}
                  >
                    Top1
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => applyAsset("theme_top2", asset.name)}
                  >
                    Top2
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => applyAsset("theme_top3", asset.name)}
                  >
                    Top3
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="fileUpload" className="btn btn-outline-danger btn-shadow px-3 my-2 ml-0 ml-sm-1 text-left">
          Incarca o imagine noua
        </label>
        <input
          type="file"
          id="fileUpload"
          onChange={uploadAsset}
          style={{ display: "none" }}
        />
      </div>

      <table className="table table-hover table-striped">
        <thead className="thead-dark hackerFont">
          <tr>
            <th scope="col">Nume Configuratie</th>
            <th scope="col">Valoare Configuratie</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CULOARE #1</td>
            <td>
              <input
                type="color"
                id="theme_color_1"
                defaultValue={globalData.theme.color_1}
              />
            </td>
          </tr>
          <tr>
            <td>CULOARE #2</td>
            <td>
              <input
                type="color"
                id="theme_color_2"
                defaultValue={globalData.theme.color_2}
              />
            </td>
          </tr>
          <tr>
            <td>IMAGINE FUNDAL</td>
            <td contentEditable="true" id="theme_img" suppressContentEditableWarning={true}>
              {globalData.theme.bg_img}
            </td>
          </tr>
          <tr>
            <td>ICONITA LOC #1</td>
            <td contentEditable="true" id="theme_top1" suppressContentEditableWarning={true}>
              {globalData.theme.top1_icon}
            </td>
          </tr>
          <tr>
            <td>ICONITA LOC #2</td>
            <td contentEditable="true" id="theme_top2" suppressContentEditableWarning={true}>
              {globalData.theme.top2_icon}
            </td>
          </tr>
          <tr>
            <td>ICONITA LOC #3</td>
            <td contentEditable="true" id="theme_top3" suppressContentEditableWarning={true}>
              {globalData.theme.top3_icon}
            </td>
          </tr>
        </tbody>
      </table>
      <button
        id="submit_p2"
        className="btn btn-outline-danger"
        type="button"
        onClick={() => {
          saveTheme();
        }}
      >
        Salveaza
      </button>
    </div>
  );
}

export default Config;