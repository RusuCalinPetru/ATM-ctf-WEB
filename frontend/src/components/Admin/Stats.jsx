import ColumnChart from "../Charts/ColumnChart";
import PieChart from "../Charts/PieChart";
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppContext from "../Data/AppContext";

function Stats(props) {
  const globalData = useContext(AppContext);
  const [counts, setCounts] = useState({});
  const [challengeSolves, setChallengeSolves] = useState([]);
  const [challengeStatsTags, setChallengeStatsTags] = useState([]);
  const [challengeStatsDifficulty, setChallengeStatsDifficulty] = useState([]);

  const getStats = () => {
    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/getStats",
        {
          name: "counts",
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
          setCounts(response.data);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });

    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/getStats",
        {
          name: "challenges",
        },
        { withCredentials: true }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirată!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else {
          let finalDataTags = [];
          let finalDataDifficulty = [];
          let finalDataSolves = [];

          response.data.forEach((data) => {
            finalDataSolves.push({
              name: data.name,
              solves: data.solveCount,
              tag: data.tags,
            });

            var result = finalDataTags.find((obj) => {
              return obj.name === data.tags[0];
            });

            if (result) {
              result.value += data.solveCount;
            } else {
              finalDataTags.push({
                name: data.tags[0],
                value: data.solveCount,
              });
            }

            var result = finalDataDifficulty.find((obj) => {
              return (
                obj.name ==
                (data.level == 3
                  ? "Expert"
                  : data.level == 2
                  ? "Dificil"
                  : data.level == 1
                  ? "Mediu"
                  : "Usor")
              );
            });

            if (result) {
              finalDataDifficulty[finalDataDifficulty.indexOf(result)].value +=
                data.solveCount;
            } else {
              finalDataDifficulty.push({
                name:
                  data.level == 3
                    ? "Expert"
                    : data.level == 2
                    ? "Dificil"
                    : data.level == 1
                    ? "Mediu"
                    : "Ușor",
                value: data.solveCount,
              });
            }
          });

          setChallengeSolves(finalDataSolves);
          setChallengeStatsTags(finalDataTags);
          setChallengeStatsDifficulty(finalDataDifficulty);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  useEffect(() => {
    getStats();
  }, []);

  return (
    <div className="container-fluid">
      <h1
        className="display-1 fw-bold text-white text-center cool"
        style={{ 
          marginBottom: "60px", 
          textShadow: "3px 3px 8px rgba(0,0,0,0.7)",
          letterSpacing: "2px"
        }}
      >
        STATISTICI
      </h1>
      
      <div className="row mb-5 g-4">
        <div className="col-md-6 mb-4">
          <div className="card bg-dark text-white border-danger h-100 shadow-lg rounded-lg" 
               style={{ transition: "all 0.3s ease", transform: "translateY(0)" }}
               onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
               onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div className="card-header bg-danger text-white py-3 rounded-top">
              <h3 className="mb-0 fw-bold"><i className="fa-solid fa-chart-pie me-2"></i>Statistici CTF</h3>
            </div>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between mb-4 align-items-center">
                <span className="fs-5 fw-light"><i className="fa-solid fa-users me-2"></i>Total Utilizatori:</span> 
                <span className="badge bg-danger fs-5 px-3 py-2 rounded-pill shadow-sm">{counts.usersCount || 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-4 align-items-center">
                <span className="fs-5 fw-light"><i className="fa-solid fa-people-group me-2"></i>Total Echipe:</span> 
                <span className="badge bg-danger fs-5 px-3 py-2 rounded-pill shadow-sm">{counts.teamsCount || 0}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fs-5 fw-light"><i className="fa-solid fa-flag me-2"></i>Total Provocari:</span> 
                <span className="badge bg-danger fs-5 px-3 py-2 rounded-pill shadow-sm">{counts.challengesCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card bg-dark text-white border-danger h-100 shadow-lg rounded-lg"
               style={{ transition: "all 0.3s ease", transform: "translateY(0)" }}
               onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
               onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div className="card-header bg-danger text-white py-3 rounded-top">
              <h3 className="mb-0 fw-bold"><i className="fa-solid fa-trophy me-2"></i>Numar de Rezolvari</h3>
            </div>
            <div className="card-body">
              <ColumnChart data={challengeSolves} tagColors={globalData.tagColors}/>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row g-4">
        <div className="col-md-6 mb-4">
          <div className="card bg-dark text-white border-danger h-100 shadow-lg rounded-lg"
               style={{ transition: "all 0.3s ease", transform: "translateY(0)" }}
               onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
               onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div className="card-header bg-danger text-white py-3 rounded-top">
              <h3 className="mb-0 fw-bold"><i className="fa-solid fa-tags me-2"></i>Rezolvari dupa Etichete</h3>
            </div>
            <div className="card-body">
              <PieChart data={challengeStatsTags} />
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card bg-dark text-white border-danger h-100 shadow-lg rounded-lg"
               style={{ transition: "all 0.3s ease", transform: "translateY(0)" }}
               onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
               onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <div className="card-header bg-danger text-white py-3 rounded-top">
              <h3 className="mb-0 fw-bold"><i className="fa-solid fa-gauge-high me-2"></i>Rezolvari dupa Dificultate</h3>
            </div>
            <div className="card-body">
              <PieChart data={challengeStatsDifficulty} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-5 mb-4">
        <div className="col-12 text-center">
          <button 
            className="btn btn-danger btn-lg shadow-lg px-4 py-3 rounded-pill" 
            onClick={getStats}
            style={{ 
              transition: "all 0.2s ease",
              transform: "scale(1)",
              fontWeight: "bold",
              letterSpacing: "1px"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <i className="fa-solid fa-rotate me-2"></i> Actualizează Datele
          </button>
        </div>
      </div>
    </div>
  );
}

export default Stats;