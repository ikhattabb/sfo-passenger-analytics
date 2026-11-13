interface Props {
  coverage: string;
}

export default function Header({ coverage }: Props) {
  return (
    <header className="header">
      <div>
        <h1>SFO Passenger Traffic</h1>
        <p>
          27 years of monthly passenger activity at San Francisco International
          Airport: growth, seasonality, COVID recovery, airline share and market
          mix.
        </p>
      </div>
      <span className="badge">{coverage}</span>
    </header>
  );
}
