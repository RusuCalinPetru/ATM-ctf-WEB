import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AppContext from "../Data/AppContext";

function Stats() {
  const globalData = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const getLogs = (index) => {
    axios
      .post(
        process.env.REACT_APP_BACKEND_URI + "/api/admin/getLogs",
        {
          page: index,
          search: searchQuery,
        },
        {
          withCredentials: true,
        }
      )
      .then((response) => {
        if (response.data.state == "sessionError") {
          globalData.alert.error("Sesiune expirata!");
          globalData.setUserData({});
          globalData.setLoggedIn(false);
          globalData.navigate("/", { replace: true });
        } else if (response.data.state == "error") {
          globalData.alert.error(response.data.message);
        } else {
          setLogs(response.data);
          setPage(index);
        }
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  useEffect(() => {
    getLogs(page);
  }, [searchQuery]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h1
            className="display-1 fw-bold text-center text-white cool"
            style={{ 
              marginBottom: "40px", 
              textShadow: "3px 3px 6px rgba(0,0,0,0.5)" 
            }}
          >
            JURNALE
          </h1>
          
          <div className="card bg-dark border-danger shadow-lg mb-4">
            <div className="card-body">
              <div
                className="d-flex justify-content-between align-items-center mb-4"
              >
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-danger btn-shadow"
                    onClick={() => getLogs(page - 1)}
                    title="Pagina anterioara"
                    disabled={page <= 1}
                  >
                    <span className="fa-solid fa-arrow-left"></span>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-shadow"
                    onClick={() => getLogs(page + 1)}
                    title="Pagina urmatoare"
                  >
                    <span className="fa-solid fa-arrow-right"></span>
                  </button>
                  <a
                    className="btn btn-outline-danger btn-shadow"
                    href={`data:text/json;charset=utf-8,${encodeURIComponent(
                      JSON.stringify(logs)
                    )}`}
                    download="jurnale.json"
                    title="Exporta jurnale"
                  >
                    <span className="fa-solid fa-file-export" /> Exporta
                  </a>
                </div>
                <div className="input-group w-auto">
                  <span className="input-group-text bg-dark text-light border-danger">
                    <i className="fa-solid fa-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-danger bg-dark text-light"
                    placeholder="Cauta..."
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="table table-hover table-dark table-striped border-danger">
                  <thead className="table-danger hackerFont">
                    <tr>
                      <th scope="col" style={{ textAlign: "center" }}>
                        #
                      </th>
                      <th scope="col">IP Autor</th>
                      <th scope="col">ID Autor</th>
                      <th scope="col">Nume Autor</th>
                      <th scope="col">Functie</th>
                      <th scope="col">Rezultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log, index) => {
                        return (
                          <tr key={log._id}>
                            <th scope="row" style={{ textAlign: "center" }}>
                              {index + (page - 1) * 100 + 1}
                            </th>
                            <td>{log.authorIp}</td>
                            <td>{log.authorId.substring(0, 8)}</td>
                            <td>{log.authorName}</td>
                            <td>{log.function.replace("exports.", "")}</td>
                            <td>{log.result ? JSON.parse(log.result).message : ""}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          Nu exista inregistrari
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-danger btn-shadow"
                    onClick={() => getLogs(page - 1)}
                    title="Pagina anterioara"
                    disabled={page <= 1}
                  >
                    <span className="fa-solid fa-arrow-left"></span>
                  </button>
                  <span className="badge bg-danger my-auto ms-2">
                    Pagina {page}
                  </span>
                  <button
                    className="btn btn-outline-danger btn-shadow ms-2"
                    onClick={() => getLogs(page + 1)}
                    title="Pagina urmatoare"
                  >
                    <span className="fa-solid fa-arrow-right"></span>
                  </button>
                </div>
                
                <div>
                  <span className="badge bg-secondary">
                    {logs.length} inregistrari afisate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;