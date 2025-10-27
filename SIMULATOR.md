# Simulando o simulador

## Mock Flight Data

Em [fetch.py](backend/routes/fetch.py) modificar as linhas `285 ~ 295` para:

```python
    # res = await flights_service.query_flights(area)
    res.flights += generate_flight_mock_data()
    res = QueryFlightsResponse(
        flights=generate_flight_mock_data(),
        partial=False,
        errors=[],
        timestamp=Time(
            value=datetime.now(),
            format=TimeFormat.RFC3339,
        )
    )
```
_Adicionar comentário em `285` e remover de `286 ~295`_

> Isso fará o modulo [flight_data.py](backend/mock/flight_data.py) ser carregado.

## Gerar dados de voos massivos

Nossa proposta é gerar dados de voos massivamente, a partir do trabalho do aluno *João* que propôs gerar dados de drones a partir do *SARPAS*, e a partir destes então gerar grandes quantidades em um loop contínuo a simulação de drones partindo e chegando à seus destinos.

Iremos partir da implementação existente, tentar compreender como foi feita, e gerar dados minimamente coerentes.

A implementação é aparentemente bastante simples, bastando extender as coordenadas (que serão geradas neste módulo dinamicamente) e os respectivos identificadores de vôos, aparentemente correlacioandos pelo índice de um `hash` (coordenadas em latitude, longitude e altitude) e uma matriz (identificadores no formato `UUID`). Talvez seja necessário correlacionar este identificador com outro sistema externo (Será que o *SARPAS* tem os dados de identificação de vôos ou eles vem de outro sistema?)

```python
# Base coordinates for smooth variations
BASE_COORDS = [
    {"lat": -23.208718442978252, "lng": -45.87002908222274, "alt": 650.0},
    {"lat": -23.208718442978252, "lng": -45.87002908222274, "alt": 650.0},
    {"lat": -23.208718442978252, "lng": -45.87002908222274, "alt": 650.0},
    {"lat": -23.208718442978252, "lng": -45.87002908222274, "alt": 650.0},
]

# UUIDs for the flights
FLIGHT_UUIDS = [
    UUID("e814314a-d25a-4552-9248-1cbff8b0dbe1"),
    UUID("81c9acfd-25af-4a1e-85d5-c3a7e5369ef2"),
    UUID("f168c00b-c709-4621-b662-090669f06bb0"),
    UUID("38183a90-bcf5-4624-b6db-2858328cdca9"),
]
```

Uma vez gerados os dados de coordenadas e de vôo, a função `generate_flight_mock_data` irá gerar os dados do vôo propriamente ditos, com o porém de que os dados de identificação da área de seriço são fixos (Precisamos dos dados do *SARPAS* para poder criar uma simulação mais robusta?).

```python
        flight = Flight(
            id=str(uuid),                                               // vem de FLIGHT_UUIDS
            aircraft_type=UAType.Ornithopter,
            current_state=current_state,                                // calculado logo acima
            operating_area=OperatingArea(
                aircraft_count=1,
                volumes=None
            ),
            simulated=False,
            recent_positions=[],
            identification_service_area=IdentificationServiceArea(      // dados fixos (gerar?)
                id=str(uuid4()),
                uss_base_url=HttpUrl("https://example.com/remoteid"),
                owner="Example Owner",
                version="1.0",
                time_end=Time(
                    value=datetime.now(),
                    format=TimeFormat.RFC3339,
                ),
                time_start=Time(
                    value=datetime.now(),
                    format=TimeFormat.RFC3339,
                ),
            ),
            details=RIDFlightDetails(
                id=str(uuid),                                           // vem de FLIGHT_UUIDS  
                uas_id=UASID(
                    registration_id=f"UA-{uuid.hex[:6].upper()}",
                ),
                operator_id="Operator123",                              // dados fixos (gerar?)
                operator_location=LatLngPoint(                          // vem de BASE_COORDS
                    lat=base["lat"],
                    lng=base["lng"],
                ),
                auth_data=RIDAuthData(
                    format=0,
                    data="ExampleAuthData",
                ),
            )
        )
```

Com isso talvez não precisemos usar a API para obtenção de dados de vôo, com a observação de que a validade da simulação se beneficiaria grandemente de uma comparação com dados reais.

## Dúvidas para este trabalho

* Ver com João
    * Será que o *SARPAS* tem os dados de identificação de vôos ou eles vem de outro sistema?
* Validar com João / ICEA:
    * Precisamos dos dados do *SARPAS* para poder criar uma simulação mais robusta?
    * A geração de dados de vôos garante uma simulação válida?