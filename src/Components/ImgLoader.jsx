import styled from "styled-components";

const ImgLoader = () => {
  return (
    <>
      <StyledWrapper>
        <div className="loader" />
      </StyledWrapper>
    </>
  );
};

const StyledWrapper = styled.div`
  .loader {
    border: 0.5px solid #ffd0c2; /* Lightest orangeish tone border */
    width: 100px;
    height: 100px;
    position: relative;
    background: #fff;
    border-radius: 4px;
    overflow: hidden;
  }

  .loader:before {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 60px;
    height: 60px;
    transform: rotate(45deg) translate(30%, 40%);
    background: #ff9371; /* Changed to orangeish tone */
    box-shadow: 32px -34px 0 5px #ff3d00; /* Changed to orangeish tone */
    animation: slide 2s infinite ease-in-out alternate;
  }

  .loader:after {
    content: "";
    position: absolute;
    left: 10px;
    top: 10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff3d00; /* Changed to orangeish tone */
    transform: rotate(0deg);
    transform-origin: 35px 145px;
    animation: rotate 2s infinite ease-in-out;
  }

  @keyframes slide {
    0%,
    100% {
      bottom: -35px;
    }

    25%,
    75% {
      bottom: -2px;
    }

    20%,
    80% {
      bottom: 2px;
    }
  }

  @keyframes rotate {
    0% {
      transform: rotate(-15deg);
    }

    25%,
    75% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(25deg);
    }
  }
`;

export default ImgLoader;
