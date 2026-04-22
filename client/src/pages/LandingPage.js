import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthed } = React.useContext(AuthContext);

  return (
    <div style={{"backgroundColor": "#DDEEEF"
}}> 

    <div className="container col-xxl-8 px-4 py-5 hero">
    <div className="row flex-lg-row-reverse align-items-center g-5 py-5">
         <div className="col-10 col-sm-8 col-lg-6">
            <img src= "./img/LandingPageImg.png" className="d-block mx-lg-auto img-fluid" alt="Bootstrap Themes" width="500" height="300" loading="lazy">
            </img>
              </div>
               <div className="col-lg-6">
                 <h1 className="display-5 fw-bold text-body-emphasis lh-1 mb-3">Build Lightning-Fast Math Fact Recall</h1> 
                 <p className="lead">A fast-paced daily practice that helps kids master addition, subtraction, multiplication, and division.</p> 
                 <div className="d-grid gap-2 d-md-flex justify-content-md-start"> 
                  {isAuthed? (
                    <button type="button" 
                    className="btn btn-primary btn-lg px-4 me-md-2" 
                    onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                      </button>
                  ): (
                    <>
                    <button type="button" 
                    className="btn btn-primary btn-lg px-4 me-md-2" 
                    onClick={() => navigate('/login')}>Login
                    </button>

                     <button type="button" 
                     className="btn btn-outline-secondary btn-lg px-4" 
                     onClick={() => navigate('/register')}>
                      Register Now
                      </button>
                  </>)}
                      </div> 
                      </div>
                        </div>
<section className="container py-5 features">
  <div className="text-center mb-5">
    <h2>Smarter Than Ordinary Flashcards</h2>
    <p className="text-muted">
      Fact Quest adapts to each child, helping them build real math fluency.
    </p>
  </div>

  <div className="row text-center g-4">
    
    <div className="col-md-3">
      <div className="p-3">
        <h4>🎯</h4>
        <h5>Adaptive Practice</h5>
        <p className="text-muted">
          The system tracks every answer and focuses practice on the facts students struggle with most.
        </p>
      </div>
    </div>

    <div className="col-md-3">
      <div className="p-3">
        <h4>🔄</h4>
        <h5>Built-In Review</h5>
        <p className="text-muted">
          Previously learned facts are automatically mixed into each session to keep skills sharp.
        </p>
      </div>
    </div>

    <div className="col-md-3">
      <div className="p-3">
        <h4>🌟</h4>
        <h5>Mastery Tracking</h5>
        <p className="text-muted">
          Facts must be answered correctly multiple times before they are considered mastered.
        </p>
      </div>
    </div>

    <div className="col-md-3">
      <div className="p-3">
        <h4>⏰</h4>
        <h5>Short Sessions</h5>
        <p className="text-muted">
          Quick practice sessions keep kids engaged while building lightning-fast recall.
        </p>
      </div>
    </div>

  </div>
</section>
    </div>
    </div>   );
}


export default LandingPage;

