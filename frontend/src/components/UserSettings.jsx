import axios from "axios";
import { useContext, useEffect, useState } from "react";
import AppContext from "./Data/AppContext";
import Navbar from "./Global/Navbar";
import PieChart from "./Charts/PieChart";

function User(props) {
  const globalData = useContext(AppContext);

  const updateUsername = () => {
    const newUsername = document.getElementById("newUsername").value;

    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/user/updateUsername",
        {
          newUsername: newUsername,
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else if (response.data.state == "success") {
          globalData.alert.success("Nume de utilizator actualizat!");
          globalData.navigate("/", { replace: true });
        } else {
          globalData.alert.error(response.data.message);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  const updatePassword = () => {
    const newPassword = document.getElementById("newPassword").value;
    const oldPassword = document.getElementById("oldPassword").value;

    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/user/updatePassword",
        {
          newPassword: newPassword,
          oldPassword: oldPassword
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else if (response.data.state == "success") {
          globalData.alert.success("Parola actualizata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else {
          globalData.alert.error(response.data.message);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  return (
    <div>
      <div className="bg" />
      <Navbar />
      <div
        className="jumbotron bg-transparent mb-0 pt-3 radius-0"
        style={{ position: "relative" }}
      >
        <div className="container">
          {globalData.userData.username ? (
            <div>
              <>
                <div className="row" style={{ textAlign: "center" }}>
                  <div className="col-md-6 mb-3">
                    <div>
                      <h3>Setari</h3>
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          id="newUsername"
                          placeholder="Nume nou de utilizator"
                          style={{
                            width: "75%",
                            margin: "auto",
                            marginBottom: "10px",
                          }}
                        />
                        <button
                          className="btn btn-outline-danger btn-shadow"
                          onClick={updateUsername}
                          style={{ marginBottom: "25px" }}
                        >
                          Actualizeaza nume
                        </button>
                      </div>

                      <div className="form-group">
                        <input
                          type="password"
                          autoComplete="new-password"
                          className="form-control"
                          id="newPassword"
                          placeholder="Parola noua"
                          style={{
                            width: "75%",
                            margin: "auto",
                            marginBottom: "10px",
                          }}
                        />
                        <input
                          type="password"
                          autoComplete="current-password"
                          className="form-control"
                          id="oldPassword"
                          placeholder="Parola veche"
                          style={{
                            width: "75%",
                            margin: "auto",
                            marginBottom: "10px",
                          }}
                        />
                        <button
                          className="btn btn-outline-danger btn-shadow"
                          onClick={updatePassword}
                          style={{ marginBottom: "25px" }}
                        >
                          Actualizeaza parola
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div>
                      <h3>Informatii utilizator</h3>
                      <ul
                        style={{
                          listStyle: "none",
                          textAlign: "center",
                          padding: 0,
                        }}
                      >
                        <li>Nume utilizator: {globalData.userData.username}</li>
                        {globalData.userData.team ? (
                          <li>Echipa: {globalData.userData.team.name}</li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            </div>
          ) : (
            <div>
              <h1
                className="display-1 bold color_white cool"
                style={{ textAlign: "center", marginBottom: "25px" }}
              >
                UTILIZATOR NEGASIT
              </h1>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default User;