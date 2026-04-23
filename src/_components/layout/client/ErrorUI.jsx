export default function ErrorUi() {
  return (
    <div className='d-flex align-items-center justify-content-center vh-100'>
      <div className='text-center'>
        <h1 className='display-1 fw-bold'>500</h1>
        <p className='fs-3'>
          <span className='text-danger'>Opps!</span> Internal Error.
        </p>
        <p className='lead'>Something went wrong.</p>
        <a href='/' className='btn btn-primary'>
          Go Home
        </a>
      </div>
    </div>
  );
}
